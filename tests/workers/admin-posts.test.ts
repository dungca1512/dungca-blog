import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  createPost,
  deletePost,
  findPostById,
  generateUniqueSlug,
  listAllPosts,
  setPostStatus,
  updatePost,
} from "@/lib/admin-posts";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM posts").run();
});

const INPUT = {
  title: "Đăng bài đầu tiên",
  summary: "Tóm tắt ngắn",
  tags: ["next", "cloudflare"],
  bodyMarkdown: "## Mở đầu\n\nNội dung.",
};

describe("createPost", () => {
  it("tạo bài nháp, sinh slug Việt và giữ tags là mảng", async () => {
    const post = await createPost(env.DB, INPUT);
    expect(post).toMatchObject({
      title: INPUT.title,
      slug: "dang-bai-dau-tien",
      status: "draft",
      publishedAt: null,
      tags: ["next", "cloudflare"],
    });
    expect((await findPostById(env.DB, post.id))?.tags).toEqual(INPUT.tags);
  });
});

describe("generateUniqueSlug", () => {
  it("thêm hậu tố, bỏ qua chính bài đang sửa và có slug dự phòng", async () => {
    const post = await createPost(env.DB, INPUT);
    expect(await generateUniqueSlug(env.DB, INPUT.title)).toBe("dang-bai-dau-tien-2");
    expect(await generateUniqueSlug(env.DB, INPUT.title, post.id)).toBe(
      "dang-bai-dau-tien",
    );
    expect(await generateUniqueSlug(env.DB, "!!! ???")).toMatch(/^bai-viet-/);
  });

  it("đếm tiếp khi cả slug có hậu tố cũng đã tồn tại", async () => {
    await createPost(env.DB, INPUT);
    await createPost(env.DB, INPUT);
    expect(await generateUniqueSlug(env.DB, INPUT.title)).toBe("dang-bai-dau-tien-3");
  });
});

describe("updatePost", () => {
  it("cập nhật nội dung và updated_at", async () => {
    const post = await createPost(env.DB, INPUT);
    await env.DB
      .prepare("UPDATE posts SET updated_at = '2020-01-01 00:00:00' WHERE id = ?")
      .bind(post.id)
      .run();

    const updated = await updatePost(env.DB, post.id, {
      ...INPUT,
      title: "Tiêu đề đã sửa",
    });
    expect(updated).toMatchObject({ title: "Tiêu đề đã sửa", slug: "tieu-de-da-sua" });
    expect(updated?.updatedAt).not.toBe("2020-01-01 00:00:00");
  });

  it("giữ slug bài đã đăng, nhưng đổi slug bài nháp", async () => {
    const published = await createPost(env.DB, INPUT);
    await setPostStatus(env.DB, published.id, "published");
    expect(
      (await updatePost(env.DB, published.id, { ...INPUT, title: "Tiêu đề khác" }))?.slug,
    ).toBe("dang-bai-dau-tien");

    const draft = await createPost(env.DB, { ...INPUT, title: "Bài nháp" });
    expect(
      (await updatePost(env.DB, draft.id, { ...INPUT, title: "Tiêu đề khác hẳn" }))?.slug,
    ).toBe("tieu-de-khac-han");
  });

  it("trả null khi id không tồn tại", async () => {
    expect(await updatePost(env.DB, 9999, INPUT)).toBeNull();
  });
});

describe("setPostStatus", () => {
  it("đặt published_at lần đăng đầu, rồi giữ nguyên qua gỡ/đăng lại", async () => {
    const post = await createPost(env.DB, INPUT);
    const first = await setPostStatus(env.DB, post.id, "published");
    expect(first?.publishedAt).not.toBeNull();

    /* SQLite lưu datetime theo giây, nên hai lần publish sát nhau có thể cùng
     * timestamp và làm test xanh giả. Đặt một ngày cũ rõ ràng để chứng minh
     * lần publish sau thật sự giữ giá trị đã có qua COALESCE. */
    const publishedAt = "2020-01-01 00:00:00";
    await env.DB
      .prepare("UPDATE posts SET published_at = ? WHERE id = ?")
      .bind(publishedAt, post.id)
      .run();

    const draft = await setPostStatus(env.DB, post.id, "draft");
    expect(draft).toMatchObject({ status: "draft", publishedAt });

    const second = await setPostStatus(env.DB, post.id, "published");
    expect(second).toMatchObject({ status: "published", publishedAt });
  });

  it("trả null khi id không tồn tại", async () => {
    expect(await setPostStatus(env.DB, 9999, "published")).toBeNull();
  });
});

describe("listAllPosts và deletePost", () => {
  it("thấy cả nháp, sắp bài mới sửa lên trước và không tải body", async () => {
    const old = await createPost(env.DB, { ...INPUT, title: "Cũ" });
    await env.DB
      .prepare("UPDATE posts SET updated_at = '2020-01-01 00:00:00' WHERE id = ?")
      .bind(old.id)
      .run();
    const recent = await createPost(env.DB, { ...INPUT, title: "Mới" });
    await setPostStatus(env.DB, recent.id, "published");

    const posts = await listAllPosts(env.DB);
    expect(posts.map((post) => post.id)).toEqual([recent.id, old.id]);
    expect(posts[0]?.bodyMarkdown).toBe("");
  });

  it("xoá được và báo false khi không còn hàng nào", async () => {
    const post = await createPost(env.DB, INPUT);
    expect(await deletePost(env.DB, post.id)).toBe(true);
    expect(await findPostById(env.DB, post.id)).toBeNull();
    expect(await deletePost(env.DB, post.id)).toBe(false);
  });
});

it("coi input là dữ liệu, không phải SQL", async () => {
  await createPost(env.DB, { ...INPUT, title: "'; DROP TABLE posts; --" });
  expect((await listAllPosts(env.DB)).length).toBe(1);
});
