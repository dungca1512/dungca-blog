import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { listPublishedPosts, fetchPostPageData } from "@/lib/posts";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM posts").run();
});

async function seed(
  slug: string,
  status: string,
  publishedAt: string | null,
  tags: string[] = [],
) {
  await env.DB.prepare(
    `INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      slug,
      `Tiêu đề ${slug}`,
      "Tóm tắt",
      JSON.stringify(tags),
      "## Mục\n\nNội dung.",
      status,
      publishedAt,
    )
    .run();
}

describe("listPublishedPosts", () => {
  it("bỏ qua bài nháp", async () => {
    await seed("da-dang", "published", "2026-03-01");
    await seed("con-nhap", "draft", null);

    const posts = await listPublishedPosts(env.DB);
    expect(posts.map((p) => p.slug)).toEqual(["da-dang"]);
  });

  it("sắp theo ngày đăng giảm dần", async () => {
    await seed("cu", "published", "2026-01-01");
    await seed("moi", "published", "2026-03-01");

    const posts = await listPublishedPosts(env.DB);
    expect(posts.map((p) => p.slug)).toEqual(["moi", "cu"]);
  });

  it("giải mã tags từ JSON thành mảng", async () => {
    await seed("co-tag", "published", "2026-03-01", ["ml", "next"]);

    const [post] = await listPublishedPosts(env.DB);
    expect(post.tags).toEqual(["ml", "next"]);
  });

  it("trả mảng rỗng khi chưa có bài nào", async () => {
    expect(await listPublishedPosts(env.DB)).toEqual([]);
  });

  it("không trả contentHtml — danh sách không cần render markdown", async () => {
    await seed("x", "published", "2026-03-01");
    const [post] = await listPublishedPosts(env.DB);
    expect(post).not.toHaveProperty("contentHtml");
  });
});

/* Đếm số VÒNG đi tới D1. prepare() chỉ dựng câu lệnh, chưa chạm mạng; chạm
 * mạng là .all()/.first()/.run() và batch(). Một batch nhiều câu lệnh vẫn
 * là một vòng — đó chính là thứ bài test này khoá lại. */
type HamBatKy = (...args: never[]) => unknown;

function demVongToiD1(db: D1Database) {
  let vong = 0;

  function demRoiGoi(ham: HamBatKy, chu: object) {
    return (...args: never[]) => {
      vong += 1;
      return ham.apply(chu, args);
    };
  }

  const boc = new Proxy(db, {
    get(muc, ten) {
      const gia = Reflect.get(muc, ten) as HamBatKy | unknown;

      if (ten === "batch") {
        return demRoiGoi(gia as HamBatKy, muc);
      }

      if (ten === "prepare") {
        return (...args: never[]) => {
          const stmt = (gia as HamBatKy).apply(muc, args) as object;
          return new Proxy(stmt, {
            get(s, t) {
              const v = Reflect.get(s, t) as HamBatKy | unknown;
              if (t === "all" || t === "first" || t === "run") {
                return demRoiGoi(v as HamBatKy, s);
              }
              return typeof v === "function" ? (v as HamBatKy).bind(s) : v;
            },
          });
        };
      }

      return typeof gia === "function" ? (gia as HamBatKy).bind(muc) : gia;
    },
  });

  return { boc, dem: () => vong };
}

describe("fetchPostPageData", () => {
  it("trả bài và danh sách bài khác trong MỘT vòng tới D1", async () => {
    await seed("dang-doc", "published", "2026-03-02", ["ml"]);
    await seed("bai-khac", "published", "2026-03-01", ["ml"]);

    const { boc, dem } = demVongToiD1(env.DB);
    const data = await fetchPostPageData(boc, "dang-doc");

    expect(data.post?.slug).toBe("dang-doc");
    expect(data.post?.contentHtml).toContain("<h2>Mục</h2>");
    expect(data.allPosts.map((p) => p.slug)).toEqual(["dang-doc", "bai-khac"]);
    expect(dem()).toBe(1);
  });

  it("bài không tồn tại: post null nhưng danh sách vẫn đủ", async () => {
    await seed("con-song", "published", "2026-03-01");

    const data = await fetchPostPageData(env.DB, "khong-co");

    expect(data.post).toBeNull();
    expect(data.allPosts.map((p) => p.slug)).toEqual(["con-song"]);
  });

  it("bài nháp bị coi như không tồn tại", async () => {
    await seed("nhap", "draft", null);

    expect((await fetchPostPageData(env.DB, "nhap")).post).toBeNull();
  });

  it("chống SQL injection qua slug", async () => {
    await seed("that", "published", "2026-03-01");
    // Prepared statement nên chuỗi này là dữ liệu, không phải cú pháp.
    const data = await fetchPostPageData(env.DB, "' OR '1'='1");

    expect(data.post).toBeNull();
    expect(data.allPosts.map((p) => p.slug)).toEqual(["that"]);
  });
});
