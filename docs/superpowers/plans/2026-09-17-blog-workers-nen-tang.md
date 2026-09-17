# Kế hoạch A — Nền tảng Workers + D1

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa blog từ static export sang Cloudflare Workers, với bài viết đọc từ D1 thay vì file Markdown, giữ nguyên giao diện và nội dung mà người đọc thấy.

**Architecture:** Next.js chạy trên Workers qua `@opennextjs/cloudflare`. Bài viết nằm trong D1, render ISR với on-demand revalidate. Projects vẫn là file Markdown đọc lúc build. `content.ts` tách thành các module một trách nhiệm để phần logic thuần tuý test được độc lập.

**Tech Stack:** Next.js 16.3.5, `@opennextjs/cloudflare` 1.20.6, Cloudflare D1 + R2, vitest 4 + `@cloudflare/vitest-pool-workers`, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-17-blog-cms-workers-design.md`

## Global Constraints

- Next.js **phải** ở `>=16.3.3` (peer range adapter là `>=15.5.24 <16 || >=16.3.3`; 16.1.6 nằm ngoài). Ghim đúng **16.3.5**.
- `output: "export"` **không** được xuất hiện trong `next.config.ts`. `trailingSlash: true` giữ nguyên.
- Mọi lệnh build cho Workers **phải** theo thứ tự `build → populateCache → (deploy|preview)`. Bỏ `populateCache` thì mọi trang prerender trả 404 kèm `NoFallbackError` trong khi build log vẫn xanh.
- Hai bucket R2 **tách biệt**: `dungca-blog-opennext-cache` (cache ISR, adapter tự quản) và `blog-media` (ảnh, sống lâu dài). Không dùng chung.
- **Không** thêm ORM. Schema bằng `wrangler d1 migrations`, truy vấn bằng prepared statement thô.
- **Không** dùng thư viện animation. Kế hoạch này không đụng gì tới giao diện.
- Markdown là nguồn sự thật. HTML **không** lưu trong D1.
- Toàn bộ text hiển thị cho người đọc bằng tiếng Việt, giữ đúng giọng hiện có.

## Phạm vi kế hoạch này

**Làm:** hạ tầng Workers, tầng dữ liệu D1, tách module, chuyển chiến lược render, migration 6 bài hiện có.

**Không làm (thuộc Kế hoạch B):** đăng nhập, khu admin, upload ảnh, design token, CI/CD, cắt tên miền.

**Một điều chỉnh so với §9 của spec:** spec xếp design token ở bước 2. Kế hoạch này dời sang đầu Kế hoạch B. Lý do spec nêu — "đừng sơn màn admin hai lần" — chỉ đòi token có mặt trước khi dựng admin, mà admin thuộc Kế hoạch B. Giữ Kế hoạch A hoàn toàn không đổi giao diện khiến rủi ro của nó sạch: nếu sau khi chuyển sang Workers mà trang trông sai, không phải phân vân giữa lỗi bảng màu và lỗi tầng dữ liệu.

**Kết thúc Kế hoạch A, site chưa được cắt tên miền.** Vẫn phục vụ người đọc bằng Cloudflare Pages như cũ; bản Workers chỉ chạy ở local và preview.

---

### Task 1: Bộ khung kiểm thử

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/smoke.test.ts`
- Modify: `package.json` (thêm script `test`, `typecheck`)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: không có
- Produces: lệnh `npm test` chạy vitest ở môi trường `node`, nhận file `tests/**/*.test.ts`, alias `@/` trỏ tới `src/`.

Blog chưa có test nào. Mọi task sau đều viết test trước, nên khung phải có trước.

Môi trường `node` chứ không `jsdom`: Kế hoạch A chỉ test logic thuần tuý và tầng dữ liệu, không render component nào. Kế hoạch B sẽ thêm project `jsdom` khi thật sự cần.

- [ ] **Bước 1: Cài phụ thuộc**

```bash
npm install -D vitest@^4.1.0
```

- [ ] **Bước 2: Thêm `.open-next/` và `.wrangler/` vào .gitignore**

Hiện `.gitignore` chỉ có `/.next/` và `/out/`. Thư mục build của Workers chưa được loại, commit nhầm là đưa vài nghìn file vào git.

Chèn ngay dưới khối `# next.js`:

```gitignore
# cloudflare workers
/.open-next/
/.wrangler/
```

- [ ] **Bước 3: Tạo `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Bước 4: Thêm script vào `package.json`**

Trong `"scripts"`, thêm:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

- [ ] **Bước 5: Viết test chứng minh khung chạy và alias hoạt động**

`tests/smoke.test.ts` — test này gọi vào code có thật (`formatDate` trong `src/lib/format.ts`), nên nếu alias `@/` hỏng thì nó đỏ. Một test `expect(1).toBe(1)` sẽ xanh cả khi alias hỏng, tức là không chứng minh được gì.

```ts
import { describe, it, expect } from "vitest";
import { formatDate } from "@/lib/format";

describe("bộ khung kiểm thử", () => {
  it("giải được alias @/ tới src/", () => {
    expect(typeof formatDate).toBe("function");
  });
});
```

- [ ] **Bước 6: Chạy test**

Chạy: `npm test`
Kỳ vọng: PASS, 1 test.

Nếu FAIL với "Cannot find module '@/lib/format'" thì alias trong `vitest.config.ts` sai — sửa ở đó, không sửa test.

- [ ] **Bước 7: Commit**

```bash
git add vitest.config.ts tests/smoke.test.ts package.json package-lock.json .gitignore
git commit -m "test: dựng khung vitest và loại thư mục build Workers khỏi git"
```

---

### Task 2: Đóng rắn cấu hình Workers

**Files:**
- Modify: `next.config.ts`
- Create: `open-next.config.ts`
- Create: `wrangler.jsonc`
- Create: `scripts/smoke.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: không có
- Produces: `npm run cf:preview` dựng và phục vụ bản Workers ở `http://localhost:8788`. `node scripts/smoke.mjs <base-url>` trả mã thoát khác 0 nếu bất kỳ route chính nào không trả 200.

Nhánh `spike/opennext-cloudflare` đã tạo ba file cấu hình và nâng Next lên 16.3.5. Task này biến chúng từ đồ thử nghiệm thành đồ chính thức, và thêm thứ spike còn thiếu: một smoke test.

Smoke test tồn tại vì một lý do cụ thể đã xảy ra thật: trong spike, build báo thành công trong khi mọi trang bài viết trả 404. Build xanh không phải bằng chứng site chạy.

- [ ] **Bước 1: Xác nhận phiên bản Next**

Chạy: `node -p "require('./package.json').dependencies.next"`
Kỳ vọng: `16.3.5`

Nếu ra `16.1.6`, chạy `npm install next@16.3.5 eslint-config-next@16.3.5` rồi làm lại bước này.

- [ ] **Bước 2: Bỏ static export khỏi `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
};

export default nextConfig;
```

`images.unoptimized` biến mất cùng `output: "export"`: nó tồn tại chỉ vì static export không chạy được trình tối ưu ảnh. Trên Workers, adapter dùng binding `images` khai báo trong `wrangler.jsonc`.

- [ ] **Bước 3: Tạo `open-next.config.ts`**

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
```

- [ ] **Bước 4: Tạo `wrangler.jsonc`**

`WORKER_SELF_REFERENCE` không phải thừa: thiếu nó thì on-demand revalidate ở Task 7 im lặng không làm gì.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "main": ".open-next/worker.js",
  "name": "dungca-blog",
  "compatibility_date": "2026-03-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    {
      // Tự trỏ về chính mình — tên service phải trùng "name" ở trên.
      // Thiếu binding này thì revalidatePath ở Task 7 không có tác dụng.
      "binding": "WORKER_SELF_REFERENCE",
      "service": "dungca-blog"
    }
  ],
  "r2_buckets": [
    {
      "binding": "NEXT_INC_CACHE_R2_BUCKET",
      "bucket_name": "dungca-blog-opennext-cache"
    }
  ],
  "images": {
    "binding": "IMAGES"
  }
}
```

- [ ] **Bước 5: Thêm script build/preview vào `package.json`**

Thứ tự trong `cf:preview` là thứ tự bắt buộc ở Global Constraints. Gói nó thành một script để không ai chạy thiếu bước.

```json
"cf:build": "opennextjs-cloudflare build",
"cf:preview": "opennextjs-cloudflare build && opennextjs-cloudflare populateCache local && wrangler dev --port 8788",
"smoke": "node scripts/smoke.mjs"
```

- [ ] **Bước 6: Viết `scripts/smoke.mjs`**

```js
/* Build xanh không phải bằng chứng site chạy. Trong spike, build báo thành
   công trong khi mọi trang bài viết trả 404 kèm NoFallbackError, vì bước
   populateCache bị bỏ qua. Script này là thứ bắt được chuyện đó. */
const base = (process.argv[2] ?? "http://localhost:8788").replace(/\/$/, "");

const ROUTES = [
  "/",
  "/blog/",
  "/projects/",
  "/blog/2026-03-03-khoi-tao-blog/",
  "/sitemap.xml",
  "/robots.txt",
];

let failed = 0;

for (const route of ROUTES) {
  let status = 0;
  try {
    const res = await fetch(`${base}${route}`, { redirect: "follow" });
    status = res.status;
  } catch (error) {
    console.error(`✗ ${route} — không gọi được: ${error.message}`);
    failed += 1;
    continue;
  }

  if (status === 200) {
    console.log(`✓ ${route}`);
  } else {
    console.error(`✗ ${route} — nhận ${status}, cần 200`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${ROUTES.length} route hỏng.`);
  process.exit(1);
}

console.log(`\n${ROUTES.length}/${ROUTES.length} route trả 200.`);
```

- [ ] **Bước 7: Chứng minh smoke test bắt được lỗi thật**

Chạy build **không** có populateCache, để tái hiện đúng lỗi của spike:

```bash
rm -rf .wrangler .open-next
npm run cf:build
npx wrangler dev --port 8788 &
sleep 8
npm run smoke
```

Kỳ vọng: **FAIL**, `/blog/2026-03-03-khoi-tao-blog/` trả 404, mã thoát 1.

Đây là bước quan trọng nhất của task. Một smoke test chưa từng đỏ là một smoke test chưa biết có chạy hay không.

Dừng server: `kill %1`

- [ ] **Bước 8: Chạy đủ thứ tự và xác nhận xanh**

```bash
npm run cf:preview &
sleep 10
npm run smoke
```

Kỳ vọng: PASS, 6/6 route trả 200.

Dừng server: `kill %1`

- [ ] **Bước 9: Commit**

```bash
git add next.config.ts open-next.config.ts wrangler.jsonc scripts/smoke.mjs package.json package-lock.json
git commit -m "feat: chạy trên Cloudflare Workers thay vì static export

Bỏ output: export, thêm adapter OpenNext và wrangler.jsonc.

Kèm smoke test vì build xanh không đồng nghĩa site chạy: bỏ bước
populateCache thì mọi trang prerender trả 404 mà build log vẫn thành công."
```

---

### Task 3: Tách logic thuần tuý khỏi trang bài viết

**Files:**
- Create: `src/lib/markdown.ts`
- Create: `src/lib/article-toc.ts`
- Create: `tests/article-toc.test.ts`
- Create: `tests/markdown.test.ts`
- Modify: `src/app/blog/[slug]/page.tsx` (bỏ dòng 1–? phần hàm cuối file, thêm import)
- Modify: `src/lib/content.ts` (bỏ hàm `markdownToHtml` cục bộ, import từ module mới)

**Interfaces:**
- Consumes: không có
- Produces:
  - `markdownToHtml(markdown: string): Promise<string>` từ `@/lib/markdown`
  - `toSlug(value: string): string` từ `@/lib/article-toc`
  - `buildArticleHtmlAndToc(contentHtml: string): { htmlWithIds: string; toc: TocItem[] }` từ `@/lib/article-toc`
  - `type TocItem = { id: string; text: string; level: 2 | 3 }` từ `@/lib/article-toc`

`src/app/blog/[slug]/page.tsx` dài ~300 dòng, trộn layout với ba hàm thuần tuý (`buildArticleHtmlAndToc`, `stripHtml`, `toSlug`). Task 6 cần `toSlug` để sinh slug bài viết, mà không ai import được nó khi nó nằm trong file page.

`toSlug` bỏ dấu tiếng Việt bằng `normalize("NFD")`. Đó là hành vi cần test kỹ vì Task 6 phụ thuộc vào nó để sinh slug từ tiêu đề có dấu.

- [ ] **Bước 1: Viết test cho `article-toc` trước khi tách**

`tests/article-toc.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { toSlug, buildArticleHtmlAndToc } from "@/lib/article-toc";

describe("toSlug", () => {
  it("bỏ dấu tiếng Việt", () => {
    expect(toSlug("Khởi tạo blog")).toBe("khoi-tao-blog");
    expect(toSlug("Học máy cơ bản")).toBe("hoc-may-co-ban");
  });

  it("xử lý được chữ đ", () => {
    // normalize("NFD") KHÔNG tách được đ/Đ — chúng là ký tự riêng, không
    // phải d kèm dấu. Test này ghim hành vi thật của hàm.
    expect(toSlug("Đường dẫn")).toBe("ung-dan");
  });

  it("gộp khoảng trắng và gạch nối thừa", () => {
    expect(toSlug("A   B -- C")).toBe("a-b-c");
  });

  it("bỏ ký tự không phải chữ số", () => {
    expect(toSlug("Next.js 16: có gì mới?")).toBe("nextjs-16-co-gi-moi");
  });

  it("trả chuỗi rỗng khi không còn ký tự dùng được", () => {
    expect(toSlug("!!!")).toBe("");
  });
});

describe("buildArticleHtmlAndToc", () => {
  it("gắn id vào h2/h3 và dựng mục lục", () => {
    const { htmlWithIds, toc } = buildArticleHtmlAndToc(
      "<h2>Mở đầu</h2><p>x</p><h3>Chi tiết</h3>",
    );

    expect(toc).toEqual([
      { id: "mo-dau", text: "Mở đầu", level: 2 },
      { id: "chi-tiet", text: "Chi tiết", level: 3 },
    ]);
    expect(htmlWithIds).toContain('<h2 id="mo-dau" class="article-heading">');
  });

  it("không đụng tới h1 và h4", () => {
    const { toc } = buildArticleHtmlAndToc("<h1>A</h1><h4>B</h4>");
    expect(toc).toEqual([]);
  });

  it("đánh số khi hai tiêu đề trùng slug", () => {
    const { toc } = buildArticleHtmlAndToc("<h2>Ghi chú</h2><h2>Ghi chú</h2>");
    expect(toc.map((t) => t.id)).toEqual(["ghi-chu", "ghi-chu-2"]);
  });

  it("đặt id thay thế khi tiêu đề không còn ký tự dùng được", () => {
    const { toc } = buildArticleHtmlAndToc("<h2>!!!</h2>");
    expect(toc[0].id).toBe("muc-1");
  });
});
```

- [ ] **Bước 2: Chạy test để xác nhận nó đỏ**

Chạy: `npx vitest run tests/article-toc.test.ts`
Kỳ vọng: FAIL với "Cannot find module '@/lib/article-toc'".

- [ ] **Bước 3: Tạo `src/lib/article-toc.ts`**

Chuyển nguyên văn ba hàm từ cuối `src/app/blog/[slug]/page.tsx` và kiểu `TocItem` từ đầu file, thêm `export`. Không sửa logic — task này chỉ dời chỗ.

```ts
export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function buildArticleHtmlAndToc(contentHtml: string): {
  htmlWithIds: string;
  toc: TocItem[];
} {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();

  const htmlWithIds = contentHtml.replace(
    /<h([2-3])>([\s\S]*?)<\/h\1>/g,
    (headingSource, levelValue, titleHtml) => {
      const level = Number(levelValue) as 2 | 3;
      const text = stripHtml(titleHtml).trim();
      if (!text) {
        return headingSource;
      }

      const baseId = toSlug(text) || `muc-${toc.length + 1}`;
      const count = (used.get(baseId) ?? 0) + 1;
      used.set(baseId, count);
      const id = count === 1 ? baseId : `${baseId}-${count}`;

      toc.push({ id, text, level });

      return `<h${level} id="${id}" class="article-heading">${titleHtml}</h${level}>`;
    },
  );

  return { htmlWithIds, toc };
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");
}

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
```

- [ ] **Bước 4: Chạy test**

Chạy: `npx vitest run tests/article-toc.test.ts`
Kỳ vọng: PASS, 8 test.

Nếu test `Đường dẫn` đỏ với giá trị khác `ung-dan`, **đừng sửa hàm** — cập nhật test cho khớp hành vi thật rồi ghi lại giá trị đúng vào comment. Task này là dời chỗ, không đổi hành vi.

- [ ] **Bước 5: Xoá ba hàm khỏi page và import từ module mới**

Trong `src/app/blog/[slug]/page.tsx`: xoá khai báo `type TocItem` và ba hàm `buildArticleHtmlAndToc`, `stripHtml`, `toSlug` ở cuối file. Thêm vào khối import:

```ts
import { buildArticleHtmlAndToc } from "@/lib/article-toc";
```

Phần thân component không đổi — nó vẫn gọi `buildArticleHtmlAndToc(post.contentHtml)` như cũ.

- [ ] **Bước 6: Viết test cho `markdown`**

`tests/markdown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { markdownToHtml } from "@/lib/markdown";

describe("markdownToHtml", () => {
  it("dựng tiêu đề", async () => {
    expect(await markdownToHtml("## Mở đầu")).toContain("<h2>Mở đầu</h2>");
  });

  it("dựng bảng GFM", async () => {
    const html = await markdownToHtml("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(html).toContain("<table>");
  });

  it("giữ nguyên khối code kèm tên ngôn ngữ", async () => {
    const html = await markdownToHtml("```ts\nconst x = 1;\n```");
    expect(html).toContain("<code");
    expect(html).toContain("const x = 1;");
  });
});
```

- [ ] **Bước 7: Chạy test để xác nhận nó đỏ**

Chạy: `npx vitest run tests/markdown.test.ts`
Kỳ vọng: FAIL với "Cannot find module '@/lib/markdown'".

- [ ] **Bước 8: Tạo `src/lib/markdown.ts`**

Chuyển nguyên văn hàm `markdownToHtml` từ `src/lib/content.ts`, thêm `export`.

```ts
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export async function markdownToHtml(markdown: string): Promise<string> {
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkHtml)
    .process(markdown);

  return processed.toString();
}
```

- [ ] **Bước 9: Cho `content.ts` dùng module mới**

Trong `src/lib/content.ts`: xoá hàm `markdownToHtml` cục bộ và ba dòng import `remark`, `remarkGfm`, `remarkHtml`. Thêm:

```ts
import { markdownToHtml } from "@/lib/markdown";
```

- [ ] **Bước 10: Chạy toàn bộ kiểm tra**

```bash
npm test && npm run typecheck && npm run lint
```

Kỳ vọng: tất cả PASS. `typecheck` là bước bắt lỗi nếu xoá nhầm thứ còn được dùng.

- [ ] **Bước 11: Commit**

```bash
git add src/lib/markdown.ts src/lib/article-toc.ts tests/article-toc.test.ts tests/markdown.test.ts "src/app/blog/[slug]/page.tsx" src/lib/content.ts
git commit -m "refactor: tách dựng mục lục và render markdown ra module riêng

Trang bài viết dài ~300 dòng, trộn layout với ba hàm thuần tuý. Task sau
cần toSlug để sinh slug bài viết, mà không import được khi nó nằm trong
file page. Dời chỗ, không đổi hành vi."
```

---

### Task 4: Tách module projects và ghim ràng buộc chỉ-đọc-lúc-build

**Files:**
- Create: `src/lib/projects.ts`
- Create: `tests/projects.test.ts`
- Modify: `src/app/projects/page.tsx`, `src/app/projects/[slug]/page.tsx`, `src/lib/github.ts`

**Interfaces:**
- Consumes: `markdownToHtml` từ `@/lib/markdown` (Task 3)
- Produces, tất cả từ `@/lib/projects`:
  - `type ProjectListItem = { slug: string; title: string; summary: string; date: string; tags: string[]; order: number; repo?: string; demoUrl?: string }`
  - `type Project = ProjectListItem & { contentHtml: string }`
  - `type FeaturedReposConfig = { githubUser: string; featured: string[] }`
  - `getProjectSlugs(): Promise<string[]>`
  - `getAllProjects(): Promise<ProjectListItem[]>`
  - `getProjectBySlug(slug: string): Promise<Project | null>`
  - `getFeaturedReposConfig(): Promise<FeaturedReposConfig>`

Worker không có filesystem lúc chạy. `content/projects/` chỉ đọc được lúc `next build`. Hôm nay điều đó đúng một cách tình cờ; task này biến nó thành ràng buộc có hiệu lực.

- [ ] **Bước 1: Viết test**

`tests/projects.test.ts` — chạy ở môi trường `node` nên `fs` dùng được, và đọc đúng `content/projects/` thật.

```ts
import { describe, it, expect } from "vitest";
import {
  getAllProjects,
  getProjectBySlug,
  getProjectSlugs,
  getFeaturedReposConfig,
} from "@/lib/projects";

describe("getProjectSlugs", () => {
  it("bỏ qua file bắt đầu bằng gạch dưới", async () => {
    const slugs = await getProjectSlugs();
    expect(slugs).toContain("2026-03-03-demo-ai-local");
    expect(slugs).not.toContain("_template");
  });
});

describe("getAllProjects", () => {
  /* content/projects/ hiện chỉ có ĐÚNG MỘT project, nên không viết được test
   * sắp xếp từ dữ liệu thật: mọi assertion về thứ tự trên mảng một phần tử
   * đều xanh kể cả khi hàm sort hỏng. Thay vào đó kiểm việc đọc và parse
   * frontmatter, là thứ thật sự có thể sai. */
  it("đọc đủ các trường frontmatter", async () => {
    const projects = await getAllProjects();
    const project = projects.find((p) => p.slug === "2026-03-03-demo-ai-local");

    expect(project).toMatchObject({
      title: "Demo AI local",
      date: "2026-03-03",
      order: 1,
    });
    expect(project?.tags).toContain("ai");
  });

  it("không trả về contentHtml trong danh sách", async () => {
    const projects = await getAllProjects();
    expect(projects[0]).not.toHaveProperty("contentHtml");
  });
});

describe("getProjectBySlug", () => {
  it("trả contentHtml đã render", async () => {
    const project = await getProjectBySlug("2026-03-03-demo-ai-local");
    expect(project).not.toBeNull();
    expect(project?.contentHtml).toContain("<");
  });

  it("trả null khi không có slug", async () => {
    expect(await getProjectBySlug("khong-ton-tai")).toBeNull();
  });
});

describe("getFeaturedReposConfig", () => {
  it("đọc được githubUser", async () => {
    const config = await getFeaturedReposConfig();
    expect(config.githubUser).toBe("dungca1512");
  });
});
```

- [ ] **Bước 2: Chạy test để xác nhận nó đỏ**

Chạy: `npx vitest run tests/projects.test.ts`
Kỳ vọng: FAIL với "Cannot find module '@/lib/projects'".

- [ ] **Bước 3: Tạo `src/lib/projects.ts`**

Chuyển từ `src/lib/content.ts` sang, **nguyên văn, không sửa logic**:

- các hàm trợ giúp `asString`, `asStringArray`, `asBoolean`, `asNumber`, `normalizeDate`, `compareDateDesc`, `stripMarkdownExtension`, `readMarkdownFiles`, `readMarkdownFile`
- `parseProjectMeta`
- `getProjectSlugs`, `getAllProjects`, `getProjectBySlug`, `getFeaturedReposConfig`
- các kiểu `ProjectListItem`, `Project`, `FeaturedReposConfig`, `MatterData`
- hằng `CONTENT_ROOT`, `PROJECTS_DIR`, `FEATURED_REPOS_FILE`, `DEFAULT_FEATURED_REPOS_CONFIG`

Thêm vào đầu file lời giải thích cho ràng buộc, vì nó không hiển nhiên với người đọc sau này:

```ts
/* Module này đọc filesystem, nên mọi hàm ở đây CHỈ chạy được lúc `next build`.
 * Worker không có filesystem lúc chạy: bất kỳ route nào gọi vào đây mà render
 * theo yêu cầu sẽ đổ ở production chứ không phải ở local.
 *
 * Ràng buộc đó được ghim bằng `dynamicParams = false` trên route projects.
 * Đừng bỏ dòng đó mà không chuyển projects sang D1 trước. */
```

- [ ] **Bước 4: Chạy test**

Chạy: `npx vitest run tests/projects.test.ts`
Kỳ vọng: PASS, 5 test.

- [ ] **Bước 5: Chuyển các import sang module mới**

- `src/app/projects/page.tsx:4` → `import { getAllProjects } from "@/lib/projects";`
- `src/app/projects/[slug]/page.tsx:9` → đổi nguồn của khối import sang `"@/lib/projects"`
- `src/lib/github.ts:1` → `import { getFeaturedReposConfig } from "@/lib/projects";`

- [ ] **Bước 6: Ghim `dynamicParams = false` trên route projects**

Trong `src/app/projects/[slug]/page.tsx`, kiểm tra có dòng này ở cấp module; nếu chưa có thì thêm, ngay cạnh `generateStaticParams`:

```ts
// Projects đọc từ filesystem (xem src/lib/projects.ts). Worker không có
// filesystem lúc chạy, nên mọi slug phải được biết lúc build. Bỏ dòng này
// thì một slug lạ sẽ cố render theo yêu cầu và đổ ở production.
export const dynamicParams = false;
```

- [ ] **Bước 7: Chạy toàn bộ kiểm tra**

```bash
npm test && npm run typecheck && npm run lint
```

Kỳ vọng: tất cả PASS.

- [ ] **Bước 8: Commit**

```bash
git add src/lib/projects.ts tests/projects.test.ts src/app/projects src/lib/github.ts
git commit -m "refactor: tách lib/projects và ghim ràng buộc chỉ đọc lúc build

Worker không có filesystem lúc chạy, nên content/projects chỉ đọc được
lúc build. dynamicParams = false biến điều đang đúng tình cờ thành lời
hứa có hiệu lực."
```

---

### Task 5: Schema D1 và bộ khung test cho tầng dữ liệu

**Files:**
- Create: `migrations/0001_create_posts.sql`
- Create: `vitest.workers.config.ts`
- Create: `tests/workers/env.d.ts`
- Create: `tests/workers/schema.test.ts`
- Modify: `vitest.config.ts`, `wrangler.jsonc`, `package.json`

**Interfaces:**
- Consumes: không có
- Produces: bảng `posts` trong D1; binding `DB` dùng được trong test qua `import { env } from "cloudflare:test"`; lệnh `npm test` chạy cả hai project.

Test cho tầng dữ liệu cần D1 thật, không phải bản giả. `@cloudflare/vitest-pool-workers` chạy test bên trong workerd với binding thật, nên SQL được kiểm bằng chính engine sẽ chạy ở production.

Nó đòi vitest `^4.1.0` — đã cài ở Task 1.

- [ ] **Bước 1: Cài phụ thuộc**

```bash
npm install -D @cloudflare/vitest-pool-workers@^0.22.0
```

- [ ] **Bước 2: Viết migration**

`migrations/0001_create_posts.sql`:

```sql
-- Bài viết. Markdown là nguồn sự thật; HTML không lưu ở đây, để đổi pipeline
-- remark là toàn bộ bài cũ đổi theo.
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  -- Mảng JSON. D1 là SQLite nên không có kiểu mảng.
  tags TEXT NOT NULL DEFAULT '[]',
  body_markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  -- Chỉ đặt khi publish lần đầu; sửa bài sau đó không được đổi giá trị này.
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Truy vấn nóng duy nhất: danh sách bài đã đăng, mới nhất trước.
CREATE INDEX idx_posts_status_published_at ON posts (status, published_at DESC);
```

- [ ] **Bước 3: Tạo database D1 và ghi binding**

```bash
npx wrangler d1 create dungca-blog
```

Lệnh in ra một khối `d1_databases` kèm `database_id` thật. Thêm khối đó vào `wrangler.jsonc`, cùng cấp với `r2_buckets`:

```jsonc
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "dungca-blog",
      "database_id": "<dán database_id lệnh trên in ra>"
    }
  ],
```

`database_id` không phải secret — nó nằm trong `wrangler.jsonc` và vào git là đúng.

- [ ] **Bước 4: Tạo `vitest.workers.config.ts`**

```ts
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";
import { fileURLToPath } from "node:url";

// Đọc file migration lúc cấu hình, ở Node, rồi đưa vào test qua binding.
// Trong workerd không có fs nên test không tự đọc file được.
const migrations = await readD1Migrations("./migrations");

export default defineWorkersConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    name: "workers",
    include: ["tests/workers/**/*.test.ts"],
    poolOptions: {
      workers: {
        miniflare: {
          compatibilityDate: "2026-03-01",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          bindings: { TEST_MIGRATIONS: migrations },
        },
      },
    },
  },
});
```

- [ ] **Bước 5: Khai báo kiểu cho binding trong test**

`tests/workers/env.d.ts`:

```ts
import type { D1Database } from "@cloudflare/workers-types";
import type { D1Migration } from "@cloudflare/vitest-pool-workers/config";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: D1Migration[];
  }
}
```

- [ ] **Bước 6: Cho `vitest.config.ts` chạy cả hai project**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
        },
        test: {
          name: "node",
          environment: "node",
          // Loại tests/workers — những file đó cần runtime workerd.
          include: ["tests/*.test.ts"],
        },
      },
      "./vitest.workers.config.ts",
    ],
  },
});
```

- [ ] **Bước 7: Viết test cho schema**

`tests/workers/schema.test.ts`:

```ts
import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

describe("schema posts", () => {
  it("chèn được bài và đọc lại", async () => {
    await env.DB.prepare(
      "INSERT INTO posts (slug, title, body_markdown) VALUES (?, ?, ?)",
    )
      .bind("bai-thu", "Bài thử", "# xin chào")
      .run();

    const row = await env.DB.prepare("SELECT * FROM posts WHERE slug = ?")
      .bind("bai-thu")
      .first<{ status: string; tags: string; created_at: string }>();

    expect(row?.status).toBe("draft");
    expect(row?.tags).toBe("[]");
    expect(row?.created_at).toBeTruthy();
  });

  it("từ chối slug trùng", async () => {
    await env.DB.prepare("INSERT INTO posts (slug, title) VALUES (?, ?)")
      .bind("trung", "A")
      .run();

    await expect(
      env.DB.prepare("INSERT INTO posts (slug, title) VALUES (?, ?)")
        .bind("trung", "B")
        .run(),
    ).rejects.toThrow();
  });

  it("từ chối status ngoài draft/published", async () => {
    await expect(
      env.DB.prepare("INSERT INTO posts (slug, title, status) VALUES (?, ?, ?)")
        .bind("sai-status", "C", "deleted")
        .run(),
    ).rejects.toThrow();
  });
});
```

Ba test này kiểm ba ràng buộc mà nếu sai thì hỏng âm thầm: mặc định `draft` (bài mới không được tự lên site), `slug` duy nhất, và `status` không nhận giá trị lạ.

- [ ] **Bước 8: Chạy test**

Chạy: `npm test`
Kỳ vọng: PASS cả project `node` lẫn `workers`.

- [ ] **Bước 9: Áp migration lên D1 thật**

```bash
npx wrangler d1 migrations apply dungca-blog --remote
```

Kỳ vọng: báo áp 1 migration.

- [ ] **Bước 10: Commit**

```bash
git add migrations vitest.config.ts vitest.workers.config.ts tests/workers wrangler.jsonc package.json package-lock.json
git commit -m "feat: schema D1 cho bài viết, kèm test chạy trong workerd

Test tầng dữ liệu chạy bằng vitest-pool-workers với D1 thật, nên SQL được
kiểm bằng chính engine sẽ chạy ở production thay vì một bản giả."
```

---

### Task 6: Tầng đọc bài viết từ D1

**Files:**
- Create: `src/lib/posts.ts`
- Create: `tests/workers/posts.test.ts`

**Interfaces:**
- Consumes: `markdownToHtml` từ `@/lib/markdown` (Task 3); bảng `posts` (Task 5)
- Produces, tất cả từ `@/lib/posts`:
  - `type PostListItem = { slug: string; title: string; summary: string; date: string; tags: string[] }` — **giữ đúng hình dạng của `PostListItem` cũ trong `content.ts`**, để `top-search.tsx` và `blog-feed.tsx` không phải sửa
  - `type Post = PostListItem & { contentHtml: string }`
  - `listPublishedPosts(db: D1Database): Promise<PostListItem[]>`
  - `findPublishedPost(db: D1Database, slug: string): Promise<Post | null>`
  - `getAllPosts(): Promise<PostListItem[]>` — bọc, tự lấy binding
  - `getPostBySlug(slug: string): Promise<Post | null>` — bọc, tự lấy binding

Hai tầng hàm là có chủ ý: hàm lõi nhận `db` làm tham số nên test truyền thẳng `env.DB` vào được, còn hàm bọc lấy binding qua `getCloudflareContext()` cho page dùng. Nếu hàm lõi tự đi lấy binding thì không test được ngoài ngữ cảnh request.

`date` ánh xạ từ `published_at`, giữ tên cũ để page không phải sửa.

- [ ] **Bước 1: Viết test**

`tests/workers/posts.test.ts`:

```ts
import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { listPublishedPosts, findPublishedPost } from "@/lib/posts";

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

describe("findPublishedPost", () => {
  it("render markdown thành html", async () => {
    await seed("co-noi-dung", "published", "2026-03-01");

    const post = await findPublishedPost(env.DB, "co-noi-dung");
    expect(post?.contentHtml).toContain("<h2>Mục</h2>");
  });

  it("trả null với bài nháp", async () => {
    await seed("nhap", "draft", null);
    expect(await findPublishedPost(env.DB, "nhap")).toBeNull();
  });

  it("trả null khi không có slug", async () => {
    expect(await findPublishedPost(env.DB, "khong-co")).toBeNull();
  });

  it("chống SQL injection qua slug", async () => {
    await seed("that", "published", "2026-03-01");
    // Prepared statement nên chuỗi này là dữ liệu, không phải cú pháp.
    const post = await findPublishedPost(env.DB, "' OR '1'='1");
    expect(post).toBeNull();
  });
});
```

- [ ] **Bước 2: Chạy test để xác nhận nó đỏ**

Chạy: `npx vitest run --project workers`
Kỳ vọng: FAIL với "Cannot find module '@/lib/posts'".

- [ ] **Bước 3: Viết `src/lib/posts.ts`**

```ts
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { markdownToHtml } from "@/lib/markdown";

/* Hình dạng này khớp PostListItem cũ trong content.ts, cố ý: top-search.tsx
 * và blog-feed.tsx đọc các trường này và không cần biết nguồn đã đổi. */
export type PostListItem = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
};

export type Post = PostListItem & {
  contentHtml: string;
};

type PostRow = {
  slug: string;
  title: string;
  summary: string;
  tags: string;
  published_at: string | null;
  body_markdown?: string;
};

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    // Một hàng có tags hỏng không đáng làm đổ cả trang blog.
    return [];
  }
}

function toListItem(row: PostRow): PostListItem {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    date: row.published_at ?? "",
    tags: parseTags(row.tags),
  };
}

/* Hàm lõi nhận db làm tham số để test truyền env.DB vào được. Hàm bọc ở
 * cuối file mới đi lấy binding. */
export async function listPublishedPosts(db: D1Database): Promise<PostListItem[]> {
  const { results } = await db
    .prepare(
      `SELECT slug, title, summary, tags, published_at
       FROM posts
       WHERE status = 'published'
       ORDER BY published_at DESC`,
    )
    .all<PostRow>();

  return results.map(toListItem);
}

export async function findPublishedPost(
  db: D1Database,
  slug: string,
): Promise<Post | null> {
  const row = await db
    .prepare(
      `SELECT slug, title, summary, tags, published_at, body_markdown
       FROM posts
       WHERE slug = ? AND status = 'published'`,
    )
    .bind(slug)
    .first<PostRow>();

  if (!row) {
    return null;
  }

  return {
    ...toListItem(row),
    contentHtml: await markdownToHtml(row.body_markdown ?? ""),
  };
}

function db(): D1Database {
  return getCloudflareContext().env.DB as unknown as D1Database;
}

export async function getAllPosts(): Promise<PostListItem[]> {
  return listPublishedPosts(db());
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return findPublishedPost(db(), slug);
}
```

- [ ] **Bước 4: Khai báo binding `DB` cho code ứng dụng**

Trong `wrangler.jsonc` binding đã có từ Task 5. Sinh kiểu:

```bash
npx wrangler types
```

Nếu `getCloudflareContext().env.DB` vẫn báo lỗi kiểu, đó là do file kiểu sinh ra chưa nằm trong `tsconfig.json` — thêm vào `include`.

- [ ] **Bước 5: Chạy test**

Chạy: `npm test`
Kỳ vọng: PASS, 9 test mới trong project `workers`.

- [ ] **Bước 6: Chạy toàn bộ kiểm tra**

```bash
npm test && npm run typecheck && npm run lint
```

- [ ] **Bước 7: Commit**

```bash
git add src/lib/posts.ts tests/workers/posts.test.ts wrangler.jsonc tsconfig.json
git commit -m "feat: đọc bài viết từ D1

Hàm lõi nhận D1Database làm tham số nên test chạy được với database thật
trong workerd; hàm bọc lấy binding cho page dùng."
```

---

### Task 7: Chuyển route blog sang D1 và ISR

**Files:**
- Modify: `src/app/blog/[slug]/page.tsx`, `src/app/blog/page.tsx`, `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/sitemap.ts`
- Modify: `src/components/top-search.tsx`, `src/components/blog-feed.tsx` (chỉ đổi nguồn import kiểu)
- Modify: `src/lib/content.ts` (xoá, xem bước 7)

**Interfaces:**
- Consumes: `getAllPosts`, `getPostBySlug`, `PostListItem` từ `@/lib/posts` (Task 6); `getAllProjects` từ `@/lib/projects` (Task 4)
- Produces: route blog render theo yêu cầu rồi nằm trong cache ISR

Đây là task đổi hành vi, không phải dời chỗ.

`src/app/blog/[slug]/page.tsx:19` đang `dynamicParams = false`: slug nào không có lúc build sẽ 404 — số phận của mọi bài viết sau này. Và `generateStaticParams` không enumerate D1 được vì lúc build không có binding.

**Đánh đổi có ý thức:** mất prerender lúc build cho bài viết, đổi lấy đăng bài tức thì.

**Lưu ý về `layout.tsx:57`:** root layout gọi `getAllPosts()` trên **mọi** route để nuôi ô tìm kiếm. Sau task này, mọi trang đều truy vấn D1. Chấp nhận được vì trang nằm trong cache ISR nên truy vấn chỉ xảy ra lúc dựng cache, nhưng cần biết: khu admin ở Kế hoạch B sẽ kế thừa layout này và không được cache, nên sẽ truy vấn thật mỗi lần mở.

- [ ] **Bước 1: Sửa route bài viết**

Trong `src/app/blog/[slug]/page.tsx`:

Đổi import:

```ts
import { getAllPosts, getPostBySlug } from "@/lib/posts";
```

(`getPostSlugs` không còn được dùng — bỏ khỏi import.)

Xoá `export const dynamicParams = false;` và toàn bộ hàm `generateStaticParams`. Thay bằng:

```ts
/* Bài viết nằm trong D1, mà lúc `next build` không có binding nên không
 * enumerate được. Trang render theo yêu cầu lần đầu rồi nằm trong cache ISR;
 * lúc đăng bài, hành động publish gọi revalidatePath để đẩy bản mới lên.
 * Con số 3600 là lưới an toàn phòng khi lời gọi revalidate thất bại, không
 * phải cơ chế cập nhật chính. */
export const revalidate = 3600;
```

Phần thân component không đổi.

- [ ] **Bước 2: Sửa các file còn lại đang import từ `@/lib/content`**

- `src/app/blog/page.tsx:4` → `import { getAllPosts } from "@/lib/posts";`
- `src/app/page.tsx:2` → `import { getAllPosts } from "@/lib/posts";`
- `src/app/layout.tsx:7` → `import { getAllPosts } from "@/lib/posts";`
- `src/components/top-search.tsx:7` → `import type { PostListItem } from "@/lib/posts";`
- `src/components/blog-feed.tsx:3` → `import type { PostListItem } from "@/lib/posts";`

- [ ] **Bước 3: Sửa sitemap**

Trong `src/app/sitemap.ts`:

```ts
import { getAllPosts } from "@/lib/posts";
import { getAllProjects } from "@/lib/projects";
```

Xoá `export const dynamic = "force-static";` và thay bằng:

```ts
// Sitemap đọc D1, nên không tĩnh được nữa. Cùng nhịp cache với trang bài.
export const revalidate = 3600;
```

Phần thân hàm không đổi.

- [ ] **Bước 4: Xoá `src/lib/content.ts`**

```bash
git rm src/lib/content.ts
```

Nội dung đã chia hết sang `posts.ts`, `projects.ts`, `markdown.ts`.

- [ ] **Bước 5: Xác nhận không còn ai import file đã xoá**

```bash
grep -rn "@/lib/content" src/ tests/ || echo "sạch"
```

Kỳ vọng: in ra `sạch`.

- [ ] **Bước 6: Typecheck**

Chạy: `npm run typecheck`
Kỳ vọng: PASS. Đây là bước bắt sót import.

- [ ] **Bước 7: Nạp dữ liệu thử vào D1 local rồi chạy preview**

Chưa có script migration (Task 8), nên chèn tay một bài để kiểm route:

```bash
npx wrangler d1 execute dungca-blog --local --command "INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at) VALUES ('bai-thu-nghiem', 'Bài thử nghiệm', 'Tóm tắt thử', '[\"thu\"]', '## Mục một\n\nNội dung thử.', 'published', '2026-03-01')"
npm run cf:preview &
sleep 10
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8788/blog/bai-thu-nghiem/
```

Kỳ vọng: `200`. Đây là bằng chứng `dynamicParams` đã mở: slug này chưa từng tồn tại lúc build.

- [ ] **Bước 8: Xác nhận trang blog liệt kê bài từ D1**

```bash
curl -s http://localhost:8788/blog/ | grep -c "Bài thử nghiệm"
```

Kỳ vọng: số lớn hơn 0.

Dừng server: `kill %1`

- [ ] **Bước 9: Cập nhật smoke test**

Trong `scripts/smoke.mjs`, đổi route bài viết vì slug cũ giờ nằm trong D1 chứ không phải file, và chưa được migrate cho tới Task 8:

```js
  "/blog/bai-thu-nghiem/",
```

- [ ] **Bước 10: Commit**

```bash
git add src/app src/components src/lib scripts/smoke.mjs
git commit -m "feat: route blog đọc từ D1 với ISR thay vì prerender lúc build

dynamicParams = false khiến mọi bài viết tạo sau khi build sẽ 404, và
generateStaticParams không enumerate D1 được vì lúc build không có binding.

Đánh đổi có ý thức: mất prerender lúc build, đổi lấy đăng bài tức thì.
Trang render lần đầu khi có người đọc rồi nằm trong cache ISR."
```

---

### Task 8: Chuyển 6 bài Markdown vào D1

**Files:**
- Create: `scripts/migrate-posts.mjs`
- Create: `tests/migrate-posts.test.ts`

**Interfaces:**
- Consumes: `content/posts/*.md`; bảng `posts` (Task 5)
- Produces: `buildPostRows(dir: string): Promise<PostRow[]>` và `toSqlStatements(rows: PostRow[]): string[]` xuất từ `scripts/migrate-posts.mjs`, với `PostRow = { slug, title, summary, tags, body_markdown, status, published_at }`

Script chạy ở Node local, nơi còn có filesystem. Upsert theo slug để chạy lại nhiều lần không nhân bản — quan trọng vì lần chạy đầu thường sai gì đó và phải chạy lại.

File `.md` cũ **giữ nguyên trong git** làm bản lưu. Không xoá ở task này.

- [ ] **Bước 1: Viết test**

`tests/migrate-posts.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildPostRows, toSqlStatements } from "../scripts/migrate-posts.mjs";

describe("buildPostRows", () => {
  it("đọc đủ 6 bài thật, bỏ qua _template", async () => {
    const rows = await buildPostRows("content/posts");
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.slug)).not.toContain("_template");
  });

  it("lấy slug từ tên file", async () => {
    const rows = await buildPostRows("content/posts");
    expect(rows.map((r) => r.slug)).toContain("2026-03-03-khoi-tao-blog");
  });

  it("đặt mọi bài migrate sang là published", async () => {
    const rows = await buildPostRows("content/posts");
    expect(rows.every((r) => r.status === "published")).toBe(true);
  });

  it("chuyển tags thành chuỗi JSON", async () => {
    const rows = await buildPostRows("content/posts");
    for (const row of rows) {
      expect(() => JSON.parse(row.tags)).not.toThrow();
      expect(Array.isArray(JSON.parse(row.tags))).toBe(true);
    }
  });

  it("giữ nguyên thân markdown, không render sang html", async () => {
    const rows = await buildPostRows("content/posts");
    expect(rows.every((r) => !r.body_markdown.includes("<p>"))).toBe(true);
  });
});

describe("toSqlStatements", () => {
  const row = {
    slug: "a",
    title: "Tiêu đề",
    summary: "Tóm tắt",
    tags: '["x"]',
    body_markdown: "## H",
    status: "published",
    published_at: "2026-03-01",
  };

  it("sinh upsert chứ không phải insert trần", () => {
    const [sql] = toSqlStatements([row]);
    expect(sql).toContain("ON CONFLICT(slug) DO UPDATE");
  });

  it("thoát dấu nháy đơn trong nội dung", () => {
    const [sql] = toSqlStatements([{ ...row, title: "Nó 'đây'" }]);
    expect(sql).toContain("Nó ''đây''");
  });

  it("giữ nguyên published_at cũ khi chạy lại", () => {
    // Chạy lại script không được đổi ngày đăng của bài đã có.
    const [sql] = toSqlStatements([row]);
    expect(sql).not.toMatch(/DO UPDATE SET[\s\S]*published_at\s*=\s*excluded/);
  });
});
```

- [ ] **Bước 2: Chạy test để xác nhận nó đỏ**

Chạy: `npx vitest run --project node tests/migrate-posts.test.ts`
Kỳ vọng: FAIL với "Cannot find module '../scripts/migrate-posts.mjs'".

- [ ] **Bước 3: Viết `scripts/migrate-posts.mjs`**

```js
/* Chuyển content/posts/*.md vào D1. Chạy ở Node local vì Worker không có
   filesystem lúc chạy.

   Upsert theo slug: lần chạy đầu thường sai gì đó và phải chạy lại, nên
   script phải chạy lại được mà không nhân bản dữ liệu. */
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

function asString(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asTags(value) {
  if (Array.isArray(value)) {
    return value.filter((t) => typeof t === "string").map((t) => t.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

function normalizeDate(value) {
  const raw = asString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString().slice(0, 10);
}

export async function buildPostRows(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile() && e.name.endsWith(".md") && !e.name.startsWith("_"))
    .map((e) => e.name);

  const rows = [];
  for (const file of files) {
    const source = await fs.readFile(path.join(dir, file), "utf8");
    const parsed = matter(source);
    const data = parsed.data;

    rows.push({
      slug: file.replace(/\.md$/i, ""),
      title: asString(data.title, file),
      summary: asString(data.summary, ""),
      tags: JSON.stringify(asTags(data.tags)),
      body_markdown: parsed.content,
      // Mọi bài đang nằm trong repo đều đã công khai trên site hôm nay.
      status: "published",
      published_at: normalizeDate(data.date),
    });
  }

  return rows.sort((a, b) => a.slug.localeCompare(b.slug));
}

function quote(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function toSqlStatements(rows) {
  return rows.map(
    (row) =>
      `INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
VALUES (${quote(row.slug)}, ${quote(row.title)}, ${quote(row.summary)}, ${quote(row.tags)}, ${quote(row.body_markdown)}, ${quote(row.status)}, ${quote(row.published_at)})
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  tags = excluded.tags,
  body_markdown = excluded.body_markdown,
  updated_at = datetime('now');`,
  );
  /* published_at cố ý KHÔNG nằm trong DO UPDATE: chạy lại script không được
     đổi ngày đăng của bài đã có trên site. */
}

// Chỉ ghi file SQL khi được gọi trực tiếp; khi import từ test thì không.
if (import.meta.url === `file://${process.argv[1]}`) {
  const rows = await buildPostRows("content/posts");
  const sql = toSqlStatements(rows).join("\n\n");
  await fs.writeFile("migrations/seed-posts.sql", sql, "utf8");
  console.log(`Đã sinh migrations/seed-posts.sql cho ${rows.length} bài.`);
  console.log("Nạp bằng:");
  console.log("  npx wrangler d1 execute dungca-blog --local --file migrations/seed-posts.sql");
  console.log("  npx wrangler d1 execute dungca-blog --remote --file migrations/seed-posts.sql");
}
```

- [ ] **Bước 4: Chạy test**

Chạy: `npx vitest run --project node tests/migrate-posts.test.ts`
Kỳ vọng: PASS, 8 test.

- [ ] **Bước 5: Sinh file SQL**

```bash
node scripts/migrate-posts.mjs
```

Kỳ vọng: in `Đã sinh migrations/seed-posts.sql cho 6 bài.`

- [ ] **Bước 6: Nạp vào D1 local và kiểm bằng preview**

```bash
npx wrangler d1 execute dungca-blog --local --file migrations/seed-posts.sql
npx wrangler d1 execute dungca-blog --local --command "SELECT count(*) AS n FROM posts WHERE status='published'"
```

Kỳ vọng: `n` ít nhất bằng 6 (có thể là 7 nếu còn bài thử nghiệm từ Task 7).

- [ ] **Bước 7: Chứng minh chạy lại không nhân bản**

```bash
npx wrangler d1 execute dungca-blog --local --file migrations/seed-posts.sql
npx wrangler d1 execute dungca-blog --local --command "SELECT count(*) AS n FROM posts"
```

Kỳ vọng: `n` **không đổi** so với bước 6. Đây là điểm mấu chốt của upsert.

- [ ] **Bước 8: Trả smoke test về slug thật và chạy**

Trong `scripts/smoke.mjs`, đổi `/blog/bai-thu-nghiem/` trở lại thành:

```js
  "/blog/2026-03-03-khoi-tao-blog/",
```

```bash
npm run cf:preview &
sleep 10
npm run smoke
```

Kỳ vọng: PASS, 6/6 route trả 200 — giờ dữ liệu đến từ D1 chứ không phải file.

Dừng server: `kill %1`

- [ ] **Bước 9: Nạp lên D1 thật**

```bash
npx wrangler d1 execute dungca-blog --remote --file migrations/seed-posts.sql
npx wrangler d1 execute dungca-blog --remote --command "SELECT slug, published_at FROM posts ORDER BY published_at DESC"
```

Kỳ vọng: liệt kê đúng 6 bài.

- [ ] **Bước 10: Chạy toàn bộ kiểm tra rồi commit**

```bash
npm test && npm run typecheck && npm run lint
git add scripts/migrate-posts.mjs tests/migrate-posts.test.ts migrations/seed-posts.sql
git commit -m "feat: chuyển 6 bài Markdown vào D1

Script chạy ở Node local vì Worker không có filesystem. Upsert theo slug
để chạy lại không nhân bản, và published_at cố ý không nằm trong nhánh
UPDATE để chạy lại không đổi ngày đăng của bài đã có.

File .md giữ nguyên trong git làm bản lưu."
```

---

## Hoàn tất Kế hoạch A

Sau Task 8:

- Blog chạy trên Workers, bài viết đọc từ D1
- `npm test` xanh ở cả hai project
- `npm run smoke` xanh trên bản preview
- Người đọc **chưa** thấy gì đổi: tên miền vẫn trỏ Cloudflare Pages

**Kiểm tra trước khi sang Kế hoạch B:**

```bash
npm test && npm run typecheck && npm run lint && npm run cf:preview
# ở cửa sổ khác:
npm run smoke
```

**Kế hoạch B** (spec §5, §6, §7): design token, GitHub OAuth, khu admin và trình soạn thảo, upload ảnh R2, CI/CD, cắt tên miền từ Pages sang Worker.
