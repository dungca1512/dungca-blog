# Kế hoạch B — Đăng nhập, khu admin, upload ảnh

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tác giả đăng nhập bằng GitHub rồi viết, sửa và đăng bài thẳng trên web — kể cả từ điện thoại — không cần commit/push.

**Architecture:** Session là cookie ký HMAC-SHA256 bằng WebCrypto, không dùng thư viện auth. Middleware chặn `/admin/*` và `/api/admin/*`. Khu admin là React client component soạn Markdown, xem trước dựng bằng chính `src/lib/markdown.ts` chạy trong trình duyệt nên preview khớp byte-for-byte với production. Ảnh upload lên R2 `BLOG_MEDIA` và phục vụ qua tên miền riêng, không đi qua Worker.

**Tech Stack:** Next.js 16.3.5 App Router · `@opennextjs/cloudflare` 1.20.6 · Cloudflare Workers + D1 + R2 · WebCrypto · vitest 4 + `@cloudflare/vitest-pool-workers` · Tailwind v4

**Spec:** `docs/superpowers/specs/2026-09-17-blog-cms-workers-design.md` (Kế hoạch này làm §5, §6, §7 — tức bước 2, 6, 7, 8, 9 trong §9. Bước 1, 3, 4, 5 đã xong ở Kế hoạch A; bước 10 đã xong ngày 2026-09-17.)

**Kế hoạch trước:** `docs/superpowers/plans/2026-09-17-blog-workers-nen-tang.md`
**Bàn giao Kế hoạch A:** `docs/superpowers/ke-hoach-a-ban-giao.md` — đọc trước khi bắt đầu, có hai cái bẫy đắt tiền.

---

## Global Constraints

Mọi task đều chịu các ràng buộc này. Vi phạm là lý do đủ để review từ chối.

1. **Secrets chỉ nạp bằng `wrangler secret put`.** `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET` TUYỆT ĐỐI không được xuất hiện trong `wrangler.jsonc` — file đó nằm trong git. Không viết giá trị thật vào bất kỳ file nào được commit, kể cả test.
2. **Access token GitHub dùng xong vứt ngay.** Sau khi gọi `/user` để xác minh danh tính, token không còn việc gì. Không lưu vào cookie, DB, log hay biến toàn cục.
3. **Danh tính admin nằm trong biến `ADMIN_GITHUB_LOGIN`.** Không hardcode `dungca1512` ở bất kỳ đâu trong `src/`.
4. **Cookie session: `httpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, hạn 30 ngày.** Không thiếu cờ nào.
5. **Mọi truy vấn D1 dùng prepared statement có `.bind()`.** Không nối chuỗi SQL. Không ORM.
6. **Không thêm dependency mới** ngoài đúng những gì task ghi rõ. Không thư viện auth, không thư viện editor, không thư viện animation.
7. **Chỉ `src/app/globals.css` được chứa literal màu.** Mọi file khác dùng token. `npm run check:colors` là cổng chặn.
8. **Không đường code nào được đọc D1 lúc `next build`.** Route đọc D1 phải `force-dynamic`, hoặc là route động có `generateStaticParams` trả mảng rỗng. Xem `tests/route-config.test.ts` — test đó khoá quy tắc này. Vi phạm làm build đổ với `SQLITE_BUSY_RECOVERY`.
9. **Không import `@/lib/projects` vào route chạy runtime.** Module đó đọc `node:fs`, chỉ chạy được lúc build, và nó nuốt lỗi ENOENT nên hỏng trong im lặng.
10. **Deploy phải đúng thứ tự `build → populateCache → deploy`.** Bỏ `populateCache` là mọi bài trả 404 trong khi log build vẫn xanh. Dùng `npm run cf:deploy`.
11. **File migration đặt tên `NNNN_mo_ta.sql`** (4 chữ số, gạch dưới). `tests/migrations-naming.test.ts` khoá điều này. Seed không để trong `migrations/`.
12. **Migration chỉ cộng thêm** (thêm cột/bảng, không đổi tên, không xoá) để rollback Worker không gặp schema lạ.
13. **Toàn bộ chữ hiển thị cho người dùng bằng tiếng Việt.** Comment code cũng tiếng Việt, theo đúng lối repo đang dùng: giải thích *tại sao*, không thuật lại *cái gì*.
14. **Agent thực thi KHÔNG được** tạo tài nguyên trên Cloudflare, đăng nhập Cloudflare, chạy `wrangler secret put`, hay deploy. Gặp việc đó thì báo `BLOCKED` và ghi rõ lệnh cần chạy để người dùng tự chạy.
15. **Agent thực thi không được dispatch subagent.**

---

## Cấu trúc file

### Tạo mới

| File | Trách nhiệm |
|---|---|
| `src/lib/session.ts` | Ký và xác minh cookie session. Thuần tuý, không đụng Next, không đụng env. |
| `src/lib/auth.ts` | Đọc secret từ env, dựng URL OAuth, đổi `code` lấy token, xác minh login khớp `ADMIN_GITHUB_LOGIN`. |
| `src/lib/admin-posts.ts` | Đọc/ghi bảng `posts` cho admin (kể cả `draft`). Tách hẳn khỏi `src/lib/posts.ts` vốn chỉ phục vụ người đọc. |
| `src/middleware.ts` | Chặn `/admin/*` và `/api/admin/*`. |
| `src/app/api/auth/login/route.ts` | Sinh `state`, chuyển sang GitHub. |
| `src/app/api/auth/callback/route.ts` | Nhận `code`, xác minh, đặt cookie session. |
| `src/app/api/auth/logout/route.ts` | Xoá cookie session. |
| `src/app/api/admin/posts/route.ts` | `GET` danh sách mọi bài, `POST` tạo bài mới. |
| `src/app/api/admin/posts/[id]/route.ts` | `GET` một bài, `PUT` cập nhật, `DELETE` xoá. |
| `src/app/api/admin/posts/[id]/publish/route.ts` | `POST` đăng, `DELETE` gỡ về nháp. Tách riêng vì đây là hành động có tác dụng phụ (`revalidatePath`), không phải cập nhật trường. |
| `src/app/api/admin/upload/route.ts` | Nhận file, ghi vào R2 `BLOG_MEDIA`, trả URL công khai. |
| `src/app/admin/layout.tsx` | Khung admin: thanh điều hướng, nút đăng xuất. |
| `src/app/admin/page.tsx` | Danh sách bài (server component). |
| `src/app/admin/posts/[id]/page.tsx` | Trang soạn thảo (server component, nạp dữ liệu rồi đưa xuống client). |
| `src/components/admin/post-editor.tsx` | Client component: form, tab soạn/xem trước, tự lưu, upload ảnh. |
| `src/components/theme-toggle.tsx` | Nút chuyển sáng/tối. |
| `scripts/check-no-hardcoded-colors.mjs` | Cổng chặn màu hardcode, bê từ portfolio. |
| `migrations/0002_them_cot_updated_at_trigger.sql` | Không có — xem Task 6, schema hiện tại đã đủ. |

### Sửa

| File | Sửa gì |
|---|---|
| `src/app/globals.css` | Thêm lớp token `--base-*`, nối token cũ (`--bg`, `--accent`…) vào lớp mới, đổi dark mode từ `prefers-color-scheme` sang `[data-theme]`, thêm CSS khu admin. |
| `src/app/layout.tsx` | Script chống nháy theme, gắn `ThemeToggle`. |
| `src/lib/article-toc.ts` | `toSlug` xử lý `đ`/`Đ`. |
| `src/lib/site.ts` | Thêm `MEDIA_BASE_URL`. |
| `package.json` | Thêm `check:colors`, `verify`. |
| `wrangler.jsonc` | Thêm `vars.ADMIN_GITHUB_LOGIN`. |
| `.github/workflows/ci.yml` | Thêm typecheck + check:colors. |
| `.github/workflows/deploy.yml` | Tạo mới — migration → build → populateCache → deploy → smoke. |

### Nguyên tắc tách file

`src/lib/posts.ts` phục vụ **người đọc**: chỉ thấy bài `published`. `src/lib/admin-posts.ts` phục vụ **tác giả**: thấy cả `draft`, và ghi được. Hai file, không gộp — gộp là một ngày nào đó một truy vấn admin lọt vào trang công khai và lộ bài nháp.

---

## Task 1: Lớp design token `--base-*` và cổng chặn màu

Spec §5. Làm trước mọi thứ về giao diện: dựng khu admin trên token xanh lá cũ rồi sau đổi sang tím là sơn lại hai lần.

**Điểm mấu chốt:** `globals.css` hiện có 1213 dòng và **mọi component đã đi qua token ngữ nghĩa** (`--bg`, `--surface`, `--text`, `--accent`…). Nên **không viết lại 1213 dòng đó**. Thêm lớp `--base-*` bên dưới, rồi định nghĩa lại các token cũ theo `--base-*`. Một lớp cầu nối, không phải một cuộc đại tu.

**Files:**
- Modify: `src/app/globals.css:1-30` (khối `:root` và `@media (prefers-color-scheme: dark)`)
- Modify: `src/app/globals.css:411` (khối dark mode thứ hai)
- Create: `scripts/check-no-hardcoded-colors.mjs`
- Modify: `package.json` (scripts)
- Test: `tests/tokens.test.ts`

**Interfaces:**
- Produces: các biến CSS `--base-background`, `--base-surface`, `--base-surface-muted`, `--base-foreground`, `--base-muted-foreground`, `--base-border`, `--base-primary`, `--base-primary-foreground`, `--base-accent`, `--base-danger`, `--base-success`, `--base-warning`, `--base-radius-sm|md|lg`, `--base-shadow-raised`, `--base-shadow-overlay`. Task 2, 8, 9 dùng các biến này và **chỉ** các biến này.
- Produces: script npm `check:colors`.

- [ ] **Step 1: Viết test thất bại cho lớp token**

Tạo `tests/tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

/* Test này không kiểm tra "trang có đẹp không" — nó khoá hai điều máy kiểm
 * được: lớp token tồn tại, và không còn đường nào để dark mode bị bỏ quên. */
describe("lớp token --base-*", () => {
  it("khai báo đủ token ngữ nghĩa mà khu admin sẽ dùng", () => {
    const required = [
      "--base-background",
      "--base-surface",
      "--base-surface-muted",
      "--base-foreground",
      "--base-muted-foreground",
      "--base-border",
      "--base-primary",
      "--base-primary-foreground",
      "--base-accent",
      "--base-danger",
      "--base-success",
      "--base-warning",
      "--base-radius-sm",
      "--base-radius-md",
      "--base-radius-lg",
      "--base-shadow-raised",
      "--base-shadow-overlay",
    ];
    const missing = required.filter((token) => !css.includes(`${token}:`));
    expect(missing).toEqual([]);
  });

  it("token cũ được nối vào lớp base chứ không giữ giá trị riêng", () => {
    /* --accent từng là #1a8917. Nếu nó còn là một hex thì lớp cầu nối chưa
     * dựng xong và đổi palette sẽ không lan tới các component cũ. */
    expect(css).toMatch(/--accent:\s*var\(--base-/);
    expect(css).toMatch(/--bg:\s*var\(--base-/);
    expect(css).toMatch(/--surface:\s*var\(--base-/);
    expect(css).toMatch(/--text:\s*var\(--base-/);
  });

  it("không còn màu xanh lá cũ", () => {
    expect(css).not.toMatch(/#1a8917/i);
    expect(css).not.toMatch(/#156d12/i);
    expect(css).not.toMatch(/#2fc94b/i);
  });

  it("dark mode chạy bằng [data-theme] chứ không chỉ prefers-color-scheme", () => {
    /* Spec §5 yêu cầu nút chuyển theme. Nút không thể ghi đè một media query. */
    expect(css).toContain('[data-theme="dark"]');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run tests/tokens.test.ts`
Expected: FAIL — cả 4 test đỏ, vì `globals.css` chưa có `--base-*`.

- [ ] **Step 3: Thay khối token đầu file `globals.css`**

Thay toàn bộ từ dòng 3 (`:root {`) đến hết khối `@media (prefers-color-scheme: dark)` ở dòng 29 bằng:

```css
/* ───────────────────────────────────────────────────────────────────────────
 * LỚP TOKEN
 *
 * Bê từ portfolio (dungca1512.github.io) để hai site cùng một ngôn ngữ thị
 * giác. Hai tầng, cố ý:
 *
 *   --base-*   lớp thật, là thứ code mới (khu admin) phải dùng
 *   --bg/--text/--accent…  lớp cầu nối, chỉ tồn tại để ~1200 dòng CSS cũ bên
 *              dưới không phải viết lại. Code MỚI đừng dùng lớp này.
 *
 * Đây là file DUY NHẤT được phép chứa literal màu. scripts/check-no-hardcoded-
 * colors.mjs chặn mọi file khác. Lý do: một hex nằm rải rác không lật theo
 * theme, và không có gì cảnh báo bạn cả.
 * ──────────────────────────────────────────────────────────────────────── */

/* Tầng 1 — màu nguyên thuỷ. Không lật theo theme. */
:root {
  --base-palette-brand-500: #4e46b4;
  --base-palette-accent-500: #40a69f;
  --base-palette-neutral-0: #fff;
  --base-palette-neutral-50: #f5f5f5;
  --base-palette-neutral-100: #ebebeb;
  --base-palette-neutral-200: #e2e2e2;
  --base-palette-neutral-600: #595d62;
  --base-palette-neutral-850: #1f1f1f;
  --base-palette-neutral-950: #0b0b0b;
  --base-palette-neutral-1000: #000;
  --base-palette-red-500: #ff4e64;
  --base-palette-green-600: #2e7d32;
  --base-palette-yellow-400: #ffb319;

  --base-radius-xs: 4px;
  --base-radius-sm: 8px;
  --base-radius-md: 12px;
  --base-radius-lg: 16px;
  --base-duration: 0.2s;
  --base-duration-fast: 0.15s;
  --base-ease: cubic-bezier(0.4, 0, 0.2, 1);
  --base-shadow-raised: 0 4px 16px -4px #0000001f;
  --base-shadow-overlay: 0 12px 32px -8px #00000029, 0 2px 8px -2px #00000014;
}

/* Tầng 2 — token ngữ nghĩa, SÁNG. */
:root {
  --base-background: var(--base-palette-neutral-50);
  --base-surface: var(--base-palette-neutral-0);
  --base-surface-muted: var(--base-palette-neutral-100);
  --base-foreground: var(--base-palette-neutral-1000);
  --base-muted-foreground: var(--base-palette-neutral-600);
  --base-border: var(--base-palette-neutral-200);

  /* KHÔNG phải brand-500 thô. Chữ trắng trên #4e46b4 chưa đạt AA; tối màu
   * dọc theo chính hue của nó cho tới khi trắng vượt ngưỡng. Token này là nền
   * của mọi nút đặc, nên sai ở đây là sai ở khắp nơi. */
  --base-primary: color-mix(in srgb, var(--base-palette-brand-500) 86%, var(--base-palette-neutral-1000));
  --base-primary-foreground: var(--base-palette-neutral-0);
  --base-accent: var(--base-palette-accent-500);
  --base-danger: var(--base-palette-red-500);
  --base-success: var(--base-palette-green-600);
  --base-warning: var(--base-palette-yellow-400);
}

/* Tầng 2 — token ngữ nghĩa, TỐI. Chỉ những token buộc phải lật mới có ở đây. */
[data-theme="dark"] {
  --base-background: var(--base-palette-neutral-950);
  /* Bóng đổ không nâng được gì lên khỏi nền gần-đen, nên độ nổi đến từ việc
   * surface sáng hơn thứ nó nằm trên. */
  --base-surface: #191919;
  --base-surface-muted: var(--base-palette-neutral-850);
  /* KHÔNG dùng trắng tinh làm chữ trên nền gần-đen: 18:1 là chói mắt. */
  --base-foreground: #ededed;
  --base-muted-foreground: #9aa0a6;
  --base-border: #ffffff1c;
}

/* Theo hệ thống khi người dùng chưa chọn gì. Script trong layout.tsx đặt
 * data-theme="dark" trước khi trang vẽ, nên khối này chỉ là lưới đỡ cho
 * trường hợp JS chưa chạy. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --base-background: var(--base-palette-neutral-950);
    --base-surface: #191919;
    --base-surface-muted: var(--base-palette-neutral-850);
    --base-foreground: #ededed;
    --base-muted-foreground: #9aa0a6;
    --base-border: #ffffff1c;
  }
}

/* Lớp cầu nối. Code mới đừng dùng — dùng --base-* ở trên. */
:root {
  --bg: var(--base-background);
  --surface: var(--base-surface);
  --surface-soft: var(--base-surface-muted);
  --border: var(--base-border);
  --text: var(--base-foreground);
  --text-soft: var(--base-muted-foreground);
  --text-muted: var(--base-muted-foreground);
  --accent: var(--base-primary);
  --accent-dark: color-mix(in srgb, var(--base-primary) 80%, var(--base-palette-neutral-1000));
  --font-ui: var(--font-ui-family), "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-display: var(--font-serif-family), Georgia, "Times New Roman", serif;
  --font-prose: var(--font-serif-family), Georgia, serif;
}
```

- [ ] **Step 4: Gỡ khối dark mode thứ hai**

Tìm khối `@media (prefers-color-scheme: dark)` còn lại (quanh dòng 411 của file gốc). Với mỗi khai báo màu trong đó, chuyển sang dùng token `--base-*` và **xoá khối media query**. Nếu khối đó chỉ định nghĩa lại các token đã có ở lớp cầu nối thì xoá thẳng.

Run: `grep -n "prefers-color-scheme" src/app/globals.css`
Expected: chỉ còn đúng một kết quả — khối lưới đỡ ở Step 3.

- [ ] **Step 5: Thêm script chặn màu hardcode**

Tạo `scripts/check-no-hardcoded-colors.mjs`:

```js
/* Một file duy nhất sở hữu màu. Mọi chỗ khác đi qua token, để đổi palette là
   một lần sửa, và để dark mode không bị bỏ quên ở một xó nào đó — một hex
   không lật theo theme, và không có gì cảnh báo bạn cả. */
import { readFileSync, globSync } from "node:fs";

const ALLOWED = "src/app/globals.css";
const NAMED_COLOURS = [
  "red", "blue", "green", "yellow", "orange", "purple", "pink", "gray",
  "grey", "brown", "cyan", "magenta", "navy", "teal", "maroon", "olive",
  "lime", "aqua", "fuchsia", "silver", "gold", "indigo", "violet", "coral",
  "salmon", "crimson", "turquoise",
];

/* Hex/rgb/hsl/oklch bắt ở bất kỳ đâu trên dòng. Tên màu chỉ bắt ở VỊ TRÍ GIÁ
 * TRỊ — ngay sau `:` hoặc `,` — để văn xuôi ("viền màu red") và định danh
 * (`bg-red-500`) không báo nhầm.
 *
 * `black`, `white`, `transparent` cố ý không có trong danh sách: trong một
 * mask gradient chúng là stencil alpha chứ không phải lựa chọn palette, không
 * lật theo theme, nên lỗi mà cổng này tồn tại để chặn không thể xảy ra qua
 * chúng. Cách viết `#fff` của một lỗi thật thì vẫn bị bắt. */
const PATTERN = new RegExp(
  `#[0-9a-fA-F]{3,8}\\b|\\b(?:rgb|rgba|hsl|hsla|oklch)\\(|[:,]\\s*['"]?(?:${NAMED_COLOURS.join("|")})\\b(?!-)`,
  "i",
);

const files = globSync("src/**/*")
  .filter((f) => /\.(ts|tsx|css)$/.test(f))
  .filter((f) => !f.endsWith(ALLOWED));

/* Sàn này là nửa còn lại của cổng: chạy sai thư mục, script từng in
 * "OK 0 files" rồi thoát 0 — đo không có gì mà vẫn xanh. */
if (files.length < 15) {
  console.error(`FAIL  chỉ khớp ${files.length} file dưới src/, phải ít nhất 15.`);
  console.error(`      Cổng này đã đo không có gì. Kiểm tra cwd và glob.`);
  process.exit(1);
}

let failed = false;

for (const file of files) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (PATTERN.test(line)) {
        console.error(`FAIL  ${file}:${i + 1}  literal màu nằm ngoài lớp token`);
        console.error(`      ${line.trim()}`);
        failed = true;
      }
    });
}

if (failed) {
  console.error(`\n      Dùng token. Chỉ ${ALLOWED} được chứa literal màu.`);
  process.exit(1);
}

console.log(`OK    ${files.length} file không chứa literal màu`);
```

- [ ] **Step 6: Thêm script npm**

Trong `package.json`, thêm vào `scripts`:

```json
"check:colors": "node scripts/check-no-hardcoded-colors.mjs",
"verify": "npm run lint && npm run typecheck && npm test && npm run check:colors && npm run build"
```

- [ ] **Step 7: Chạy cổng màu, sửa cho tới khi xanh**

Run: `npm run check:colors`
Expected: `OK <n> file không chứa literal màu`. Nếu đỏ, chuyển literal đó sang token. Không nới lỏng regex để né.

- [ ] **Step 8: Chạy test và build**

Run: `npx vitest run tests/tokens.test.ts && npm run typecheck && npm run build`
Expected: 4 test PASS, typecheck sạch, build xanh.

- [ ] **Step 9: Xem bằng mắt**

Run: `npm run dev` rồi mở `http://localhost:3000`
Expected: site đổi từ xanh lá sang tím/teal. Chữ đọc được, không có vùng nào mất tương phản. Đây là bước người, không phải test.

- [ ] **Step 10: Commit**

```bash
git add src/app/globals.css scripts/check-no-hardcoded-colors.mjs package.json tests/tokens.test.ts
git commit -m "feat: mang lớp token --base-* của portfolio sang blog

Đổi xanh lá #1a8917 sang tím #4e46b4 + teal. Không viết lại 1200 dòng CSS
cũ: định nghĩa lại token cũ (--bg, --accent…) theo --base-*, làm lớp cầu
nối. Code mới dùng --base-* trực tiếp.

Dark mode chuyển từ prefers-color-scheme sang [data-theme] để Task 2 gắn
được nút chuyển — nút không ghi đè được media query.

Kèm check:colors: chỉ globals.css được chứa literal màu.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Nút chuyển theme, không nháy

Spec §5 yêu cầu nút chuyển theme thay vì chỉ theo hệ thống.

**Files:**
- Create: `src/components/theme-toggle.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css` (CSS cho nút)
- Test: `tests/theme-toggle.test.ts`

**Interfaces:**
- Consumes: token `--base-*` từ Task 1; selector `[data-theme="dark"]`.
- Produces: component `ThemeToggle` (client, không props). Khoá localStorage `"theme"`, giá trị `"light"` | `"dark"`.

- [ ] **Step 1: Viết test thất bại**

Tạo `tests/theme-toggle.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const layout = readFileSync("src/app/layout.tsx", "utf8");
const toggle = readFileSync("src/components/theme-toggle.tsx", "utf8");

describe("chuyển theme", () => {
  it("layout đặt theme TRƯỚC khi trang vẽ", () => {
    /* Nếu đặt data-theme trong useEffect, trang vẽ nền sáng rồi mới nhảy sang
     * tối — cái chớp trắng vào mặt người đọc ban đêm. Phải là script chặn
     * trong <head>. */
    expect(layout).toContain("dangerouslySetInnerHTML");
    expect(layout).toMatch(/suppressHydrationWarning/);
  });

  it("nút đọc và ghi cùng một khoá localStorage với script chống nháy", () => {
    expect(layout).toContain('"theme"');
    expect(toggle).toContain('"theme"');
  });

  it("nút là client component", () => {
    expect(toggle).toMatch(/^"use client"/);
  });

  it("nút có nhãn cho trình đọc màn hình", () => {
    expect(toggle).toContain("aria-label");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run tests/theme-toggle.test.ts`
Expected: FAIL — `src/components/theme-toggle.tsx` chưa tồn tại.

- [ ] **Step 3: Viết component**

Tạo `src/components/theme-toggle.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/* Khoá này dùng chung với script chống nháy trong layout.tsx. Đổi ở một nơi
 * mà quên nơi kia là theme bị quên giữa hai lần tải trang. */
const STORAGE_KEY = "theme";

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  /* Khởi tạo "light" rồi đồng bộ trong effect, không đọc DOM lúc render:
   * server không có document, đọc ở đó là hỏng hydration. */
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Chế độ riêng tư chặn localStorage. Theme vẫn đổi cho phiên này; chỉ
       * là không nhớ được. Không đáng làm đổ nút. */
    }
  }

  return (
    <button
      aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      className="icon-btn"
      onClick={toggle}
      type="button"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
```

- [ ] **Step 4: Gắn script chống nháy vào layout**

Trong `src/app/layout.tsx`, đổi thẻ `<html>` và thêm script:

```tsx
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /* suppressHydrationWarning: script bên dưới sửa data-theme trước khi React
     * hydrate, nên HTML server gửi xuống và DOM thật cố tình khác nhau ở đúng
     * thuộc tính này. Không có cờ này là React kêu ầm mỗi lần tải. */
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Chạy đồng bộ, trước khi trình duyệt vẽ frame đầu. Đặt trong
            useEffect thì người đọc ban đêm ăn một chớp trắng mỗi lần chuyển
            trang. Giữ script này ngắn và không phụ thuộc gì. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.dataset.theme=t}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${fontUi.variable} ${fontSerif.variable}`}>
```

Rồi trong `topbar-right`, ngay trước `<a className="topbar-pill" …>`, thêm:

```tsx
<ThemeToggle />
```

Và thêm import ở đầu file:

```tsx
import { ThemeToggle } from "@/components/theme-toggle";
```

- [ ] **Step 5: Chạy test**

Run: `npx vitest run tests/theme-toggle.test.ts && npm run typecheck`
Expected: 4 PASS, typecheck sạch.

- [ ] **Step 6: Kiểm tra bằng mắt việc chống nháy**

Run: `npm run dev`, mở trang, bấm nút sang tối, rồi **tải lại trang (F5)**.
Expected: trang hiện ra đã tối ngay, không có chớp trắng. Đây là điều test tĩnh không chứng minh được — phải nhìn.

- [ ] **Step 7: Commit**

```bash
git add src/components/theme-toggle.tsx src/app/layout.tsx src/app/globals.css tests/theme-toggle.test.ts
git commit -m "feat: nút chuyển giao diện sáng/tối

Script chặn trong <head> đặt data-theme trước frame đầu tiên. Làm trong
useEffect thì người đọc ban đêm ăn một chớp trắng mỗi lần chuyển trang.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Ký và xác minh session

Spec §6.1 và §7.3. Đây là code bảo mật — task này có nhiều test nhất trong kế hoạch, cố ý.

**Files:**
- Create: `src/lib/session.ts`
- Test: `tests/session.test.ts`

**Interfaces:**
- Produces:
  - `type SessionPayload = { login: string; exp: number }` — `exp` là epoch **giây**.
  - `signSession(payload: SessionPayload, secret: string): Promise<string>`
  - `verifySession(token: string, secret: string, nowSeconds?: number): Promise<SessionPayload | null>` — trả `null` cho mọi trường hợp hỏng, không ném lỗi.
  - `SESSION_COOKIE_NAME = "dungca_blog_session"`
  - `SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30`
- Task 4, 5 dùng đúng các chữ ký này.

- [ ] **Step 1: Viết test thất bại**

Tạo `tests/session.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  signSession,
  verifySession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

const SECRET = "secret-chi-dung-trong-test-khong-phai-secret-that";
const NOW = 1_800_000_000;

describe("session", () => {
  it("ký rồi xác minh thì ra lại đúng payload", async () => {
    const token = await signSession({ login: "ai-do", exp: NOW + 100 }, SECRET);
    expect(await verifySession(token, SECRET, NOW)).toEqual({
      login: "ai-do",
      exp: NOW + 100,
    });
  });

  it("từ chối token ký bằng secret khác", async () => {
    const token = await signSession({ login: "ai-do", exp: NOW + 100 }, SECRET);
    expect(await verifySession(token, "secret-khac", NOW)).toBeNull();
  });

  it("từ chối khi payload bị sửa mà giữ nguyên chữ ký", async () => {
    /* Đây là tấn công thật: đổi login thành người khác rồi dán lại chữ ký cũ. */
    const token = await signSession({ login: "nguoi-thuong", exp: NOW + 100 }, SECRET);
    const [body, signature] = token.split(".");
    const forged = btoa(JSON.stringify({ login: "admin", exp: NOW + 100 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(body).not.toEqual(forged);
    expect(await verifySession(`${forged}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("từ chối token đã hết hạn", async () => {
    const token = await signSession({ login: "ai-do", exp: NOW - 1 }, SECRET);
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });

  it("chấp nhận token còn đúng một giây", async () => {
    const token = await signSession({ login: "ai-do", exp: NOW + 1 }, SECRET);
    expect(await verifySession(token, SECRET, NOW)).not.toBeNull();
  });

  it("trả null chứ không ném lỗi với rác", async () => {
    for (const rac of ["", ".", "a.b", "khong-co-dau-cham", "a.b.c", "!!!.???"]) {
      expect(await verifySession(rac, SECRET, NOW)).toBeNull();
    }
  });

  it("từ chối token không có chữ ký", async () => {
    const body = btoa(JSON.stringify({ login: "admin", exp: NOW + 100 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifySession(body, SECRET, NOW)).toBeNull();
    expect(await verifySession(`${body}.`, SECRET, NOW)).toBeNull();
  });

  it("hạn session là 30 ngày", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(2_592_000);
  });

  it("tên cookie không đổi bất ngờ", () => {
    /* Đổi tên là mọi người đang đăng nhập bị đá ra. Test này để việc đó là
     * quyết định có ý thức chứ không phải tai nạn khi đổi tên biến. */
    expect(SESSION_COOKIE_NAME).toBe("dungca_blog_session");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run tests/session.test.ts`
Expected: FAIL — `src/lib/session.ts` chưa tồn tại.

- [ ] **Step 3: Viết `src/lib/session.ts`**

```ts
/* Session tự ký bằng WebCrypto, không dùng thư viện auth.
 *
 * Định dạng: "<payload base64url>.<chữ ký HMAC-SHA256 base64url>".
 * Payload KHÔNG mã hoá, chỉ được ký — nó chỉ chứa login và hạn dùng, không có
 * gì bí mật. Thứ nó bảo đảm là "không ai sửa được", không phải "không ai đọc
 * được".
 *
 * Không có state phía server: không bảng session, không cách thu hồi một
 * session lẻ. Đổi SESSION_SECRET là đá toàn bộ ra, và với blog một người dùng
 * thì đó đúng là công cụ thu hồi cần có. */

export const SESSION_COOKIE_NAME = "dungca_blog_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionPayload = {
  login: string;
  /* Epoch GIÂY, không phải mili giây. Date.now()/1000. */
  exp: number;
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signSession(
  payload: SessionPayload,
  secret: string,
): Promise<string> {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    new TextEncoder().encode(body),
  );
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(
  token: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  if (!body || !signature) return null;

  const signatureBytes = fromBase64Url(signature);
  if (!signatureBytes) return null;

  /* crypto.subtle.verify so sánh trong thời gian hằng định. Đừng thay bằng
   * `signHere === signature` — so sánh chuỗi thoát sớm ở byte đầu khác nhau,
   * và thời gian thoát đó rò rỉ chữ ký đúng từng byte một. */
  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    signatureBytes,
    new TextEncoder().encode(body),
  );
  if (!valid) return null;

  const bodyBytes = fromBase64Url(body);
  if (!bodyBytes) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bodyBytes));
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;
  const { login, exp } = parsed as Record<string, unknown>;
  if (typeof login !== "string" || typeof exp !== "number") return null;

  /* Hạn kiểm SAU khi xác minh chữ ký, không phải trước: kiểm trước là trả lời
   * "token này hết hạn chưa" cho cả token giả, một kênh rò rỉ nhỏ và miễn phí
   * để bịt. */
  if (exp <= nowSeconds) return null;

  return { login, exp };
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run tests/session.test.ts`
Expected: 9 test PASS.

- [ ] **Step 5: Phá code để chứng minh test có răng**

Sửa tạm `verifySession`: đổi `if (exp <= nowSeconds) return null;` thành `if (false) return null;`.
Run: `npx vitest run tests/session.test.ts`
Expected: test "từ chối token đã hết hạn" ĐỎ. Nếu vẫn xanh, test đó vô dụng — sửa test.
Rồi hoàn nguyên thay đổi.

- [ ] **Step 6: Commit**

```bash
git add src/lib/session.ts tests/session.test.ts
git commit -m "feat: ký và xác minh session bằng HMAC-SHA256

WebCrypto có sẵn trong Workers, không cần thư viện. Payload chỉ được ký
chứ không mã hoá — nó chứa login và hạn, không có gì bí mật.

Xác minh bằng crypto.subtle.verify chứ không so sánh chuỗi: so sánh chuỗi
thoát sớm ở byte khác nhau đầu tiên, và thời gian thoát rò rỉ chữ ký đúng
từng byte.

Kiểm hạn SAU khi xác minh chữ ký, không phải trước.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: Vòng OAuth GitHub

Spec §6.1.

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/callback/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Modify: `wrangler.jsonc` (thêm `vars.ADMIN_GITHUB_LOGIN`)
- Test: `tests/auth.test.ts`

**Interfaces:**
- Consumes: `signSession`, `SESSION_COOKIE_NAME`, `SESSION_MAX_AGE_SECONDS` từ Task 3.
- Produces:
  - `type AuthEnv = { GITHUB_CLIENT_ID: string; GITHUB_CLIENT_SECRET: string; SESSION_SECRET: string; ADMIN_GITHUB_LOGIN: string }`
  - `readAuthEnv(): Promise<AuthEnv>` — ném `Error` nếu thiếu biến nào.
  - `buildAuthorizeUrl(clientId: string, redirectUri: string, state: string): string`
  - `exchangeCodeForLogin(code, clientId, clientSecret, fetchImpl?): Promise<string | null>` — trả login GitHub, hoặc `null` nếu đổi token thất bại.
  - `STATE_COOKIE_NAME = "dungca_blog_oauth_state"`
- Task 5 dùng `readAuthEnv`.

- [ ] **Step 1: Viết test thất bại**

Tạo `tests/auth.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  buildAuthorizeUrl,
  exchangeCodeForLogin,
  STATE_COOKIE_NAME,
} from "@/lib/auth";

describe("buildAuthorizeUrl", () => {
  it("dựng đúng URL uỷ quyền của GitHub", () => {
    const url = new URL(
      buildAuthorizeUrl("id-cua-app", "https://vi-du.test/api/auth/callback", "state-123"),
    );
    expect(url.origin + url.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(url.searchParams.get("client_id")).toBe("id-cua-app");
    expect(url.searchParams.get("redirect_uri")).toBe("https://vi-du.test/api/auth/callback");
    expect(url.searchParams.get("state")).toBe("state-123");
  });

  it("chỉ xin quyền đọc hồ sơ công khai", () => {
    /* Xác minh danh tính không cần quyền gì hơn. Xin repo hay user:email là
     * xin thứ mình không dùng, và là thứ sẽ mất nếu app bị chiếm. */
    const url = new URL(buildAuthorizeUrl("id", "https://vi-du.test/cb", "s"));
    const scope = url.searchParams.get("scope") ?? "";
    expect(scope).not.toContain("repo");
    expect(scope).not.toContain("write");
    expect(scope).not.toContain("delete");
  });
});

describe("exchangeCodeForLogin", () => {
  function fakeFetch(
    tokenResponse: unknown,
    userResponse: unknown,
    seen: string[] = [],
  ) {
    return async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seen.push(url);
      if (url.includes("access_token")) {
        if (init?.body) seen.push(String(init.body));
        return new Response(JSON.stringify(tokenResponse), {
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify(userResponse), {
        headers: { "content-type": "application/json" },
      });
    };
  }

  it("trả login khi đổi token thành công", async () => {
    const login = await exchangeCodeForLogin(
      "code-abc",
      "id",
      "secret",
      fakeFetch({ access_token: "gho_xyz" }, { login: "ai-do" }),
    );
    expect(login).toBe("ai-do");
  });

  it("trả null khi GitHub không trả access_token", async () => {
    const login = await exchangeCodeForLogin(
      "code-sai",
      "id",
      "secret",
      fakeFetch({ error: "bad_verification_code" }, {}),
    );
    expect(login).toBeNull();
  });

  it("trả null khi /user không có login", async () => {
    const login = await exchangeCodeForLogin(
      "code",
      "id",
      "secret",
      fakeFetch({ access_token: "gho_xyz" }, { message: "Bad credentials" }),
    );
    expect(login).toBeNull();
  });

  it("KHÔNG để lộ client_secret ra ngoài đường gọi token", async () => {
    const seen: string[] = [];
    await exchangeCodeForLogin(
      "code",
      "id",
      "sieu-bi-mat",
      fakeFetch({ access_token: "gho_xyz" }, { login: "ai-do" }, seen),
    );
    const urls = seen.filter((s) => s.startsWith("http"));
    for (const url of urls) {
      expect(url).not.toContain("sieu-bi-mat");
    }
    /* Secret chỉ được đi trong thân POST tới github.com, không đi trong URL
     * (URL vào log proxy và lịch sử trình duyệt) và không đi tới api.github.com. */
    const userCall = urls.find((u) => u.includes("api.github.com"));
    expect(userCall).toBeDefined();
  });
});

describe("hằng số", () => {
  it("cookie state có tên riêng, không trùng cookie session", () => {
    expect(STATE_COOKIE_NAME).toBe("dungca_blog_oauth_state");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run tests/auth.test.ts`
Expected: FAIL — `src/lib/auth.ts` chưa tồn tại.

- [ ] **Step 3: Viết `src/lib/auth.ts`**

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const STATE_COOKIE_NAME = "dungca_blog_oauth_state";

export type AuthEnv = {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  ADMIN_GITHUB_LOGIN: string;
};

/* Ném lỗi thay vì trả giá trị mặc định khi thiếu biến. Một SESSION_SECRET
 * rỗng vẫn ký được token — và ai cũng ký được token y hệt. Hỏng ồn ào còn hơn
 * hỏng im lặng ở đúng chỗ này. */
export async function readAuthEnv(): Promise<AuthEnv> {
  const { env } = await getCloudflareContext({ async: true });
  const keys = [
    "GITHUB_CLIENT_ID",
    "GITHUB_CLIENT_SECRET",
    "SESSION_SECRET",
    "ADMIN_GITHUB_LOGIN",
  ] as const;

  const missing = keys.filter((key) => {
    const value = (env as unknown as Record<string, unknown>)[key];
    return typeof value !== "string" || value.length === 0;
  });

  if (missing.length > 0) {
    /* Chỉ nêu TÊN biến thiếu, không bao giờ nêu giá trị. */
    throw new Error(`Thiếu cấu hình auth: ${missing.join(", ")}`);
  }

  return Object.fromEntries(
    keys.map((key) => [key, (env as unknown as Record<string, string>)[key]]),
  ) as AuthEnv;
}

export function buildAuthorizeUrl(
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  /* scope rỗng = chỉ hồ sơ công khai. Xác minh danh tính không cần hơn, và
   * quyền không xin là quyền không mất khi app bị chiếm. */
  url.searchParams.set("scope", "");
  return url.toString();
}

/* fetchImpl để test tiêm được bản giả. Mặc định là fetch toàn cục. */
export async function exchangeCodeForLogin(
  code: string,
  clientId: string,
  clientSecret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  /* Secret đi trong THÂN POST, không đi trong query string: URL nằm lại trong
   * log proxy, log truy cập và lịch sử trình duyệt. */
  const tokenResponse = await fetchImpl("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  if (!tokenResponse.ok) return null;

  const tokenBody = (await tokenResponse.json()) as { access_token?: unknown };
  const accessToken = tokenBody.access_token;
  if (typeof accessToken !== "string" || accessToken.length === 0) return null;

  const userResponse = await fetchImpl("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
      /* GitHub API từ chối request không có User-Agent. */
      "user-agent": "dungca-blog",
    },
  });

  if (!userResponse.ok) return null;

  const user = (await userResponse.json()) as { login?: unknown };
  if (typeof user.login !== "string" || user.login.length === 0) return null;

  /* accessToken hết việc từ đây. Không lưu, không trả ra, không log. Nó ra
   * khỏi scope cùng hàm này. */
  return user.login;
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run tests/auth.test.ts`
Expected: 6 test PASS.

- [ ] **Step 5: Viết route `/api/auth/login`**

Tạo `src/app/api/auth/login/route.ts`:

```ts
import { NextResponse } from "next/server";

import { STATE_COOKIE_NAME, buildAuthorizeUrl, readAuthEnv } from "@/lib/auth";

/* Đụng env và sinh số ngẫu nhiên mỗi lần gọi: không có gì để prerender. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const env = await readAuthEnv();

  /* state chống CSRF: kẻ tấn công dụ được nạn nhân mở URL callback của mình
   * thì cookie này không khớp, và ta từ chối. */
  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/auth/callback", request.url).toString();

  const response = NextResponse.redirect(
    buildAuthorizeUrl(env.GITHUB_CLIENT_ID, redirectUri, state),
  );

  response.cookies.set(STATE_COOKIE_NAME, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    /* 10 phút: đủ cho người bấm đồng ý trên GitHub, không đủ để nằm lại lâu. */
    maxAge: 600,
  });

  return response;
}
```

- [ ] **Step 6: Viết route `/api/auth/callback`**

Tạo `src/app/api/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";

import { STATE_COOKIE_NAME, exchangeCodeForLogin, readAuthEnv } from "@/lib/auth";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from "@/lib/session";

export const dynamic = "force-dynamic";

function tuChoi(message: string) {
  /* Không nêu lý do cụ thể cho người dùng: "login sai" và "state sai" là hai
   * thông tin khác nhau, và gộp chúng lại làm việc dò tìm khó hơn một chút mà
   * không tốn gì. Lý do thật nằm ở message để đọc trong wrangler tail. */
  console.warn(`Từ chối đăng nhập: ${message}`);
  return new NextResponse("Không thể đăng nhập.", { status: 403 });
}

export async function GET(request: Request) {
  const env = await readAuthEnv();
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STATE_COOKIE_NAME}=`))
    ?.slice(STATE_COOKIE_NAME.length + 1);

  if (!code || !state || !expectedState || state !== expectedState) {
    return tuChoi("state không khớp hoặc thiếu code");
  }

  const login = await exchangeCodeForLogin(
    code,
    env.GITHUB_CLIENT_ID,
    env.GITHUB_CLIENT_SECRET,
  );

  if (!login) {
    return tuChoi("đổi code lấy danh tính thất bại");
  }

  /* So sánh không phân biệt hoa thường: GitHub không phân biệt hoa thường
   * trong username, nên "DungCa1512" và "dungca1512" là cùng một người. */
  if (login.toLowerCase() !== env.ADMIN_GITHUB_LOGIN.toLowerCase()) {
    return tuChoi(`login "${login}" không phải admin`);
  }

  const token = await signSession(
    { login, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS },
    env.SESSION_SECRET,
  );

  const response = NextResponse.redirect(new URL("/admin", request.url));

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  /* Cookie state hết việc. Để lại là để lại rác có thời hạn. */
  response.cookies.set(STATE_COOKIE_NAME, "", { path: "/", maxAge: 0 });

  return response;
}
```

- [ ] **Step 7: Viết route `/api/auth/logout`**

Tạo `src/app/api/auth/logout/route.ts`:

```ts
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/session";

export const dynamic = "force-dynamic";

/* POST chứ không GET: một <img src="/api/auth/logout"> trên trang bất kỳ sẽ
 * đá người dùng ra nếu đây là GET. Phiền chứ không nguy hiểm, nhưng vẫn là
 * thứ không nên để hở. */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
```

- [ ] **Step 8: Thêm `ADMIN_GITHUB_LOGIN` vào `wrangler.jsonc`**

Thêm vào object gốc:

```jsonc
  // KHÔNG phải secret — đây là username GitHub công khai, và để nó ở đây thì
  // đọc config là biết ai vào được admin. Ba thứ kia (GITHUB_CLIENT_ID,
  // GITHUB_CLIENT_SECRET, SESSION_SECRET) là secret và chỉ nạp bằng
  // `wrangler secret put`, tuyệt đối không viết vào file này.
  "vars": {
    "ADMIN_GITHUB_LOGIN": "dungca1512"
  },
```

- [ ] **Step 9: Sinh lại kiểu và chạy toàn bộ kiểm tra**

Run: `npx wrangler types --env-interface=CloudflareEnv && npm run typecheck && npm test`
Expected: `worker-configuration.d.ts` có `ADMIN_GITHUB_LOGIN: string`, typecheck sạch, mọi test xanh.

**Lưu ý:** phải là `--env-interface=CloudflareEnv`. `wrangler types` trần sinh ra `Cloudflare.Env`, không gộp được với thứ `@opennextjs/cloudflare` cần.

- [ ] **Step 10: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth tests/auth.test.ts wrangler.jsonc worker-configuration.d.ts
git commit -m "feat: vòng đăng nhập GitHub OAuth

Tự viết, không dùng Auth.js: thư viện đó chạy trên Workers lắt léo, và tự
làm là đúng một trong bốn động lực của dự án.

client_secret đi trong thân POST chứ không trong query string — URL nằm
lại trong log proxy và lịch sử trình duyệt.

Access token GitHub hết việc ngay sau khi gọi /user: không lưu, không trả
ra, không log. scope rỗng — xác minh danh tính không cần quyền gì hơn.

Logout là POST chứ không GET: một thẻ <img> trỏ tới GET sẽ đá người dùng
ra khỏi phiên.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: Middleware chặn khu admin

Spec §6.1 câu cuối: "Middleware chặn `/admin/*` và mọi API ghi."

**Files:**
- Create: `src/middleware.ts`
- Test: `tests/middleware-config.test.ts`

**Interfaces:**
- Consumes: `verifySession`, `SESSION_COOKIE_NAME` (Task 3); `readAuthEnv` (Task 4).
- Produces: bảo đảm mọi request tới `/admin/*` và `/api/admin/*` đều có session hợp lệ. Task 7, 8, 9, 10 dựa vào điều này và **vẫn phải tự kiểm tra lần nữa ở route** — xem Step 5.

- [ ] **Step 1: Viết test thất bại**

Tạo `tests/middleware-config.test.ts`:

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const middleware = readFileSync("src/middleware.ts", "utf8");

describe("middleware", () => {
  it("matcher phủ cả /admin/* lẫn /api/admin/*", () => {
    expect(middleware).toContain("/admin/:path*");
    expect(middleware).toContain("/api/admin/:path*");
  });

  it("matcher phủ cả chính /admin, không chỉ đường con", () => {
    /* "/admin/:path*" trong Next KHÔNG khớp "/admin" trần. Thiếu dòng này thì
     * trang danh sách bài mở tự do cho cả thiên hạ. */
    expect(middleware).toMatch(/"\/admin"/);
  });

  it("không chạy trên route công khai", () => {
    expect(middleware).not.toContain("/blog/:path*");
    expect(middleware).not.toContain('"/:path*"');
  });
});

/* Test này quét cây thư mục thật, nên route admin mới thêm sau này cũng bị
 * soi — không phụ thuộc vào việc ai đó nhớ cập nhật danh sách. */
describe("mọi route /api/admin đều tự kiểm tra session", () => {
  function routeFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return routeFiles(full);
      return entry.name === "route.ts" ? [full] : [];
    });
  }

  it("không route nào chỉ dựa vào middleware", () => {
    /* Middleware là lớp một. Nếu một ngày matcher bị sửa sai, lớp hai phải đỡ.
     * Một route ghi D1 mà không tự kiểm tra là một route chờ tai nạn. */
    const files = routeFiles("src/app/api/admin");
    expect(files.length).toBeGreaterThan(0);
    const khongKiemTra = files.filter(
      (file) => !readFileSync(file, "utf8").includes("requireSession"),
    );
    expect(khongKiemTra).toEqual([]);
  });
});
```

**Lưu ý cho người thực thi:** khối test thứ hai sẽ đỏ cho tới Task 7 (lúc đó `src/app/api/admin/` mới có file). Ở task này chỉ cần khối đầu xanh; tạo thư mục rỗng sẽ làm `readdirSync` trả `[]` và `expect(files.length).toBeGreaterThan(0)` đỏ. Vì vậy: **viết cả file test ngay nhưng đánh dấu khối thứ hai `describe.skip` ở Task 5, và bỏ `.skip` ở Task 7 Step 6.** Ghi rõ lý do bằng comment trong file.

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run tests/middleware-config.test.ts`
Expected: FAIL — `src/middleware.ts` chưa tồn tại.

- [ ] **Step 3: Viết `src/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";

import { readAuthEnv } from "@/lib/auth";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/session";

/* Lớp phòng thủ thứ nhất. Route API vẫn tự kiểm tra lần nữa (requireSession):
 * một matcher viết sai là một lỗ hổng im lặng, và lỗi cấu hình không nên là
 * thứ duy nhất đứng giữa Internet và bảng posts. */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let session = null;
  if (token) {
    const env = await readAuthEnv();
    session = await verifySession(token, env.SESSION_SECRET);
  }

  if (session) {
    return NextResponse.next();
  }

  /* API trả 401 để fetch phía client đọc được; trang thì chuyển sang đăng
   * nhập, vì ném JSON vào mặt người đang mở trình duyệt là vô nghĩa. */
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/api/auth/login", request.url));
}

export const config = {
  /* "/admin/:path*" KHÔNG khớp "/admin" trần trong Next — phải liệt kê riêng.
   * Thiếu nó là trang danh sách bài mở tự do. */
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
```

- [ ] **Step 4: Chạy test**

Run: `npx vitest run tests/middleware-config.test.ts && npm run typecheck`
Expected: 3 test đầu PASS, khối thứ hai skip, typecheck sạch.

- [ ] **Step 5: Thêm `requireSession` dùng chung**

Trước hết thêm dòng import này vào **đầu** `src/lib/auth.ts`, ngay dưới import `getCloudflareContext` (import phải nằm ở đầu file — chèn giữa file thì `import/first` của eslint báo lỗi):

```ts
import { SESSION_COOKIE_NAME, verifySession, type SessionPayload } from "@/lib/session";
```

Rồi thêm hàm này vào **cuối** `src/lib/auth.ts`:

```ts
/* Lớp phòng thủ thứ hai, gọi trong TỪNG route API ghi. Có middleware rồi vẫn
 * cần: matcher là cấu hình, và cấu hình sai không kêu. Hai lớp độc lập thì
 * phải hỏng cả hai mới thủng. */
export async function requireSession(request: Request): Promise<SessionPayload | null> {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  if (!token) return null;

  const env = await readAuthEnv();
  const session = await verifySession(token, env.SESSION_SECRET);
  if (!session) return null;

  if (session.login.toLowerCase() !== env.ADMIN_GITHUB_LOGIN.toLowerCase()) {
    /* Session ký hợp lệ nhưng cho người khác. Xảy ra khi ADMIN_GITHUB_LOGIN
     * bị đổi sau lúc cấp session — session cũ phải chết theo. */
    return null;
  }

  return session;
}
```

- [ ] **Step 6: Chạy toàn bộ kiểm tra**

Run: `npm run typecheck && npm test && npm run build`
Expected: tất cả xanh.

- [ ] **Step 7: Commit**

```bash
git add src/middleware.ts src/lib/auth.ts tests/middleware-config.test.ts
git commit -m "feat: middleware chặn /admin và /api/admin

Hai lớp độc lập: middleware chặn theo matcher, và mỗi route API ghi tự gọi
requireSession. Matcher là cấu hình, mà cấu hình sai thì không kêu — phải
hỏng cả hai lớp mới thủng.

Matcher liệt kê riêng \"/admin\": trong Next, \"/admin/:path*\" không khớp
\"/admin\" trần, và thiếu nó là trang danh sách bài mở tự do.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: Tầng dữ liệu cho admin và slug tiếng Việt

Spec §6.5 và §7.3 ("sinh slug tiếng Việt").

**Điểm mấu chốt cần sửa:** `toSlug` trong `src/lib/article-toc.ts` dùng `normalize("NFD")` rồi bỏ dấu tổ hợp. Cách đó xử lý được `ă â ê ô ơ ư` và mọi dấu thanh, **nhưng không xử lý `đ`** — `đ` là một ký tự đơn, không phân rã được, nên nó bị `[^a-z0-9\s-]` xoá thẳng. "Đăng bài mới" ra `ang-bai-moi`. Tiêu đề bắt đầu bằng "Đ" là chuyện thường ngày trong tiếng Việt, nên phải sửa.

**Hệ quả phải biết trước khi sửa:** `toSlug` cũng sinh `id` cho thẻ `<h2>/<h3>` trong `buildArticleHtmlAndToc`. Sửa nó là **đổi neo (anchor) của các bài đã đăng** — link kiểu `#ang-nhap` ngoài đời sẽ hỏng. Với blog cá nhân mới ba bài thì cái giá đó nhỏ hơn cái giá để nguyên một cái bug sinh slug sai vĩnh viễn. Vẫn phải sửa, và phải biết mình đang đánh đổi cái gì.

**Files:**
- Modify: `src/lib/article-toc.ts:47-58` (`toSlug`)
- Create: `src/lib/admin-posts.ts`
- Test: `tests/article-toc.test.ts` (thêm case), `tests/workers/admin-posts.test.ts`

**Interfaces:**
- Consumes: `toSlug` từ `@/lib/article-toc`; kiểu `PostListItem` từ `@/lib/posts`.
- Produces:
  - `type AdminPostRow = { id: number; slug: string; title: string; summary: string; tags: string[]; bodyMarkdown: string; status: "draft" | "published"; publishedAt: string | null; updatedAt: string }`
  - `type PostInput = { title: string; summary: string; tags: string[]; bodyMarkdown: string }`
  - `listAllPosts(db: D1Database): Promise<AdminPostRow[]>`
  - `findPostById(db: D1Database, id: number): Promise<AdminPostRow | null>`
  - `createPost(db: D1Database, input: PostInput): Promise<AdminPostRow>`
  - `updatePost(db: D1Database, id: number, input: PostInput): Promise<AdminPostRow | null>`
  - `setPostStatus(db: D1Database, id: number, status: "draft" | "published"): Promise<AdminPostRow | null>`
  - `deletePost(db: D1Database, id: number): Promise<boolean>`
  - `generateUniqueSlug(db: D1Database, title: string, excludeId?: number): Promise<string>`
- Task 7 dùng toàn bộ danh sách này.

- [ ] **Step 1: Thêm test slug tiếng Việt vào `tests/article-toc.test.ts`**

```ts
describe("toSlug với tiếng Việt", () => {
  it("chuyển đ và Đ thành d", () => {
    /* đ là ký tự đơn, KHÔNG phân rã được bằng NFD, nên cách bỏ dấu thông
     * thường xoá thẳng nó. "Đăng bài" từng ra "ang-bai". Tiêu đề mở đầu bằng
     * Đ là chuyện thường ngày trong tiếng Việt. */
    expect(toSlug("Đăng bài mới")).toBe("dang-bai-moi");
    expect(toSlug("Cái đẹp của đường ống")).toBe("cai-dep-cua-duong-ong");
  });

  it("bỏ dấu thanh và dấu mũ", () => {
    expect(toSlug("Học máy trên trình duyệt")).toBe("hoc-may-tren-trinh-duyet");
    expect(toSlug("Ưu điểm")).toBe("uu-diem");
  });

  it("gộp khoảng trắng và gạch nối thừa", () => {
    expect(toSlug("  Nhiều   khoảng —— trắng  ")).toBe("nhieu-khoang-trang");
  });

  it("không để lại gạch nối ở đầu hay cuối", () => {
    expect(toSlug("— Mở đầu —")).toBe("mo-dau");
    expect(toSlug("Kết thúc!")).toBe("ket-thuc");
  });

  it("trả chuỗi rỗng khi không còn ký tự dùng được", () => {
    expect(toSlug("!!! ???")).toBe("");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ ở đúng case `đ`**

Run: `npx vitest run tests/article-toc.test.ts`
Expected: FAIL — case `đ` nhận `"ang-bai-moi"`, và case "không để lại gạch nối" có thể cũng đỏ.

- [ ] **Step 3: Sửa `toSlug`**

```ts
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    /* đ/Đ là ký tự đơn trong Unicode, không phải d + dấu, nên NFD không tách
     * nó ra và bước bỏ ký tự lạ bên dưới xoá thẳng. Phải thay tay TRƯỚC khi
     * normalize. Không có dòng này, "Đăng bài" ra "ang-bai". */
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    /* Sau khi xoá ký tự lạ, "— Mở đầu —" còn "- mo dau -". Cắt gạch nối thừa
     * ở hai đầu, nếu không slug trông như lỗi. */
    .replace(/^-|-$/g, "");
}
```

Lưu ý thứ tự: `.toLowerCase()` chạy trước nên chỉ cần khớp `đ` thường, không cần `Đ`.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run tests/article-toc.test.ts`
Expected: mọi test PASS, kể cả các test cũ về mục lục.

- [ ] **Step 5: Viết test D1 thất bại cho `admin-posts`**

Tạo `tests/workers/admin-posts.test.ts`:

```ts
import { env, applyD1Migrations } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  listAllPosts,
  findPostById,
  createPost,
  updatePost,
  setPostStatus,
  deletePost,
  generateUniqueSlug,
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
  it("tạo bài ở trạng thái nháp, chưa có ngày đăng", async () => {
    const post = await createPost(env.DB, INPUT);
    expect(post.status).toBe("draft");
    expect(post.publishedAt).toBeNull();
    expect(post.title).toBe("Đăng bài đầu tiên");
  });

  it("sinh slug tiếng Việt không dấu từ tiêu đề", async () => {
    const post = await createPost(env.DB, INPUT);
    expect(post.slug).toBe("dang-bai-dau-tien");
  });

  it("giữ tags dưới dạng mảng khi đọc lại", async () => {
    const post = await createPost(env.DB, INPUT);
    const again = await findPostById(env.DB, post.id);
    expect(again?.tags).toEqual(["next", "cloudflare"]);
  });
});

describe("generateUniqueSlug", () => {
  it("thêm hậu tố số khi slug đã có", async () => {
    await createPost(env.DB, INPUT);
    expect(await generateUniqueSlug(env.DB, "Đăng bài đầu tiên")).toBe(
      "dang-bai-dau-tien-2",
    );
  });

  it("đếm tiếp khi đã có cả hậu tố", async () => {
    await createPost(env.DB, INPUT);
    await createPost(env.DB, INPUT);
    expect(await generateUniqueSlug(env.DB, "Đăng bài đầu tiên")).toBe(
      "dang-bai-dau-tien-3",
    );
  });

  it("bỏ qua chính bài đang sửa", async () => {
    /* Sửa bài mà không đổi tiêu đề thì slug phải giữ nguyên, không nhảy
     * thành "-2" — đổi slug là gãy mọi link đã chia sẻ. */
    const post = await createPost(env.DB, INPUT);
    expect(
      await generateUniqueSlug(env.DB, "Đăng bài đầu tiên", post.id),
    ).toBe("dang-bai-dau-tien");
  });

  it("có slug dự phòng khi tiêu đề không còn ký tự dùng được", async () => {
    const slug = await generateUniqueSlug(env.DB, "!!! ???");
    expect(slug).not.toBe("");
    expect(slug).toMatch(/^bai-viet/);
  });
});

describe("updatePost", () => {
  it("cập nhật nội dung và đổi updated_at", async () => {
    const post = await createPost(env.DB, INPUT);
    await env.DB.prepare("UPDATE posts SET updated_at = '2020-01-01 00:00:00' WHERE id = ?")
      .bind(post.id)
      .run();

    const updated = await updatePost(env.DB, post.id, {
      ...INPUT,
      title: "Tiêu đề đã sửa",
    });
    expect(updated?.title).toBe("Tiêu đề đã sửa");
    expect(updated?.updatedAt).not.toBe("2020-01-01 00:00:00");
  });

  it("KHÔNG đổi slug khi bài đã đăng", async () => {
    /* Slug của bài đã đăng là địa chỉ công khai. Đổi tiêu đề không được phép
     * làm gãy link người khác đã chia sẻ. */
    const post = await createPost(env.DB, INPUT);
    await setPostStatus(env.DB, post.id, "published");

    const updated = await updatePost(env.DB, post.id, {
      ...INPUT,
      title: "Tiêu đề hoàn toàn khác",
    });
    expect(updated?.slug).toBe("dang-bai-dau-tien");
  });

  it("CÓ đổi slug khi bài còn là nháp", async () => {
    const post = await createPost(env.DB, INPUT);
    const updated = await updatePost(env.DB, post.id, {
      ...INPUT,
      title: "Tiêu đề hoàn toàn khác",
    });
    expect(updated?.slug).toBe("tieu-de-hoan-toan-khac");
  });

  it("trả null với id không tồn tại", async () => {
    expect(await updatePost(env.DB, 9999, INPUT)).toBeNull();
  });
});

describe("setPostStatus", () => {
  it("đặt published_at lần đầu đăng", async () => {
    const post = await createPost(env.DB, INPUT);
    const published = await setPostStatus(env.DB, post.id, "published");
    expect(published?.status).toBe("published");
    expect(published?.publishedAt).not.toBeNull();
  });

  it("GIỮ NGUYÊN published_at ở lần đăng thứ hai", async () => {
    /* Gỡ bài sửa lỗi chính tả rồi đăng lại không được đẩy bài lên đầu trang
     * chủ như bài mới. Ngày đăng là ngày đăng lần đầu. */
    const post = await createPost(env.DB, INPUT);
    const first = await setPostStatus(env.DB, post.id, "published");
    await setPostStatus(env.DB, post.id, "draft");
    const second = await setPostStatus(env.DB, post.id, "published");
    expect(second?.publishedAt).toBe(first?.publishedAt);
  });

  it("gỡ về nháp thì giữ published_at", async () => {
    const post = await createPost(env.DB, INPUT);
    await setPostStatus(env.DB, post.id, "published");
    const draft = await setPostStatus(env.DB, post.id, "draft");
    expect(draft?.status).toBe("draft");
    expect(draft?.publishedAt).not.toBeNull();
  });

  it("trả null với id không tồn tại", async () => {
    expect(await setPostStatus(env.DB, 9999, "published")).toBeNull();
  });
});

describe("listAllPosts", () => {
  it("trả CẢ bài nháp — khác listPublishedPosts", async () => {
    const a = await createPost(env.DB, { ...INPUT, title: "Bài nháp" });
    const b = await createPost(env.DB, { ...INPUT, title: "Bài đã đăng" });
    await setPostStatus(env.DB, b.id, "published");

    const posts = await listAllPosts(env.DB);
    expect(posts.map((p) => p.id).sort()).toEqual([a.id, b.id].sort());
  });

  it("bài sửa gần nhất lên đầu", async () => {
    const a = await createPost(env.DB, { ...INPUT, title: "Cũ" });
    await env.DB.prepare("UPDATE posts SET updated_at = '2020-01-01 00:00:00' WHERE id = ?")
      .bind(a.id)
      .run();
    const b = await createPost(env.DB, { ...INPUT, title: "Mới" });

    const posts = await listAllPosts(env.DB);
    expect(posts[0].id).toBe(b.id);
  });

  it("không trả body_markdown — danh sách không cần cả bài", async () => {
    await createPost(env.DB, INPUT);
    const [post] = await listAllPosts(env.DB);
    expect(post.bodyMarkdown).toBe("");
  });
});

describe("deletePost", () => {
  it("xoá được và báo true", async () => {
    const post = await createPost(env.DB, INPUT);
    expect(await deletePost(env.DB, post.id)).toBe(true);
    expect(await findPostById(env.DB, post.id)).toBeNull();
  });

  it("báo false khi không có gì để xoá", async () => {
    expect(await deletePost(env.DB, 9999)).toBe(false);
  });
});

describe("an toàn", () => {
  it("chống SQL injection qua tiêu đề", async () => {
    await createPost(env.DB, { ...INPUT, title: "'; DROP TABLE posts; --" });
    /* Bảng còn sống là bằng chứng chuỗi kia được coi là dữ liệu. */
    expect((await listAllPosts(env.DB)).length).toBe(1);
  });
});
```

- [ ] **Step 6: Chạy test, xác nhận đỏ**

Run: `npx vitest run --project workers`
Expected: FAIL — `src/lib/admin-posts.ts` chưa tồn tại.

- [ ] **Step 7: Viết `src/lib/admin-posts.ts`**

```ts
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { toSlug } from "@/lib/article-toc";

/* Tách hẳn khỏi src/lib/posts.ts. posts.ts phục vụ NGƯỜI ĐỌC và chỉ thấy bài
 * đã đăng; file này phục vụ TÁC GIẢ và thấy cả nháp. Gộp hai thứ vào một file
 * là mở đường cho ngày một truy vấn admin lọt vào trang công khai và lộ bản
 * nháp chưa muốn ai đọc. */

export type AdminPostRow = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  bodyMarkdown: string;
  status: "draft" | "published";
  publishedAt: string | null;
  updatedAt: string;
};

export type PostInput = {
  title: string;
  summary: string;
  tags: string[];
  bodyMarkdown: string;
};

type Row = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  tags: string;
  body_markdown?: string;
  status: string;
  published_at: string | null;
  updated_at: string;
};

function toAdminRow(row: Row): AdminPostRow {
  let tags: string[] = [];
  try {
    const parsed = JSON.parse(row.tags) as unknown;
    if (Array.isArray(parsed)) {
      tags = parsed.filter((tag): tag is string => typeof tag === "string");
    }
  } catch {
    /* Một hàng tags hỏng không đáng làm đổ cả trang quản trị. */
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    tags,
    bodyMarkdown: row.body_markdown ?? "",
    status: row.status === "published" ? "published" : "draft",
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

export async function generateUniqueSlug(
  db: D1Database,
  title: string,
  excludeId?: number,
): Promise<string> {
  /* Tiêu đề toàn ký tự đặc biệt ("!!! ???") cho slug rỗng, mà slug rỗng thì
   * URL bài viết thành "/blog//" — hỏng và khó hiểu. Dự phòng bằng timestamp
   * để vẫn duy nhất. */
  const base = toSlug(title) || `bai-viet-${Date.now()}`;

  for (let suffix = 1; suffix < 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const clash = await db
      .prepare("SELECT id FROM posts WHERE slug = ? AND id IS NOT ?")
      .bind(candidate, excludeId ?? null)
      .first<{ id: number }>();

    if (!clash) return candidate;
  }

  /* 999 bài trùng tiêu đề là chuyện không xảy ra, nhưng vòng lặp vô hạn trong
   * Worker thì tốn tiền thật. */
  return `${base}-${Date.now()}`;
}

export async function listAllPosts(db: D1Database): Promise<AdminPostRow[]> {
  /* Không chọn body_markdown: danh sách chỉ hiện tiêu đề và trạng thái, mà
   * mỗi bài có thể vài chục KB. */
  const { results } = await db
    .prepare(
      `SELECT id, slug, title, summary, tags, status, published_at, updated_at
       FROM posts
       ORDER BY updated_at DESC, id DESC`,
    )
    .all<Row>();

  return results.map(toAdminRow);
}

export async function findPostById(
  db: D1Database,
  id: number,
): Promise<AdminPostRow | null> {
  const row = await db
    .prepare(
      `SELECT id, slug, title, summary, tags, body_markdown, status, published_at, updated_at
       FROM posts WHERE id = ?`,
    )
    .bind(id)
    .first<Row>();

  return row ? toAdminRow(row) : null;
}

export async function createPost(
  db: D1Database,
  input: PostInput,
): Promise<AdminPostRow> {
  const slug = await generateUniqueSlug(db, input.title);

  const row = await db
    .prepare(
      `INSERT INTO posts (slug, title, summary, tags, body_markdown, status)
       VALUES (?, ?, ?, ?, ?, 'draft')
       RETURNING id, slug, title, summary, tags, body_markdown, status, published_at, updated_at`,
    )
    .bind(
      slug,
      input.title,
      input.summary,
      JSON.stringify(input.tags),
      input.bodyMarkdown,
    )
    .first<Row>();

  /* RETURNING sau INSERT thành công luôn có hàng; nếu không thì DB hỏng và im
   * lặng là cách tệ nhất để phát hiện. */
  if (!row) throw new Error("Tạo bài thất bại: INSERT không trả về hàng nào");

  return toAdminRow(row);
}

export async function updatePost(
  db: D1Database,
  id: number,
  input: PostInput,
): Promise<AdminPostRow | null> {
  const current = await findPostById(db, id);
  if (!current) return null;

  /* Slug của bài ĐÃ ĐĂNG là địa chỉ công khai — người khác đã chia sẻ nó. Sửa
   * lại tiêu đề không được phép làm gãy những link đó. Bài còn nháp thì chưa
   * ai biết, đổi thoải mái. */
  const slug =
    current.status === "published"
      ? current.slug
      : await generateUniqueSlug(db, input.title, id);

  const row = await db
    .prepare(
      `UPDATE posts
       SET slug = ?, title = ?, summary = ?, tags = ?, body_markdown = ?,
           updated_at = datetime('now')
       WHERE id = ?
       RETURNING id, slug, title, summary, tags, body_markdown, status, published_at, updated_at`,
    )
    .bind(
      slug,
      input.title,
      input.summary,
      JSON.stringify(input.tags),
      input.bodyMarkdown,
      id,
    )
    .first<Row>();

  return row ? toAdminRow(row) : null;
}

export async function setPostStatus(
  db: D1Database,
  id: number,
  status: "draft" | "published",
): Promise<AdminPostRow | null> {
  /* COALESCE: published_at chỉ ghi ở lần đăng ĐẦU TIÊN. Gỡ bài sửa lỗi chính
   * tả rồi đăng lại không được đẩy nó lên đầu trang chủ như bài mới. */
  const row = await db
    .prepare(
      `UPDATE posts
       SET status = ?,
           published_at = CASE WHEN ? = 'published'
                               THEN COALESCE(published_at, datetime('now'))
                               ELSE published_at END,
           updated_at = datetime('now')
       WHERE id = ?
       RETURNING id, slug, title, summary, tags, body_markdown, status, published_at, updated_at`,
    )
    .bind(status, status, id)
    .first<Row>();

  return row ? toAdminRow(row) : null;
}

export async function deletePost(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

/* Xem comment dài trong src/lib/posts.ts: không đường gọi nào của hàm này
 * được phép chạy lúc `next build`. Mọi route admin đều force-dynamic. */
export async function adminDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}
```

- [ ] **Step 8: Chạy test, xác nhận xanh**

Run: `npx vitest run --project workers`
Expected: mọi test PASS (cả `posts.test.ts` cũ lẫn `admin-posts.test.ts` mới).

- [ ] **Step 9: Phá code để chứng minh test có răng**

Đổi `COALESCE(published_at, datetime('now'))` thành `datetime('now')`.
Run: `npx vitest run --project workers`
Expected: test "GIỮ NGUYÊN published_at ở lần đăng thứ hai" ĐỎ. Hoàn nguyên.

- [ ] **Step 10: Chạy toàn bộ và commit**

Run: `npm test && npm run typecheck && npm run check:colors`

```bash
git add src/lib/admin-posts.ts src/lib/article-toc.ts tests/workers/admin-posts.test.ts tests/article-toc.test.ts
git commit -m "feat: tầng dữ liệu admin và sửa slug tiếng Việt

toSlug xoá mất chữ đ: NFD phân rã được dấu thanh nhưng đ là ký tự đơn,
không tách ra được, nên bước lọc ký tự lạ xoá thẳng. \"Đăng bài\" ra
\"ang-bai\". Thay tay trước khi normalize.

Việc này cũng đổi id của các thẻ h2/h3 trong bài đã đăng, tức link kiểu
#ang-nhap sẽ hỏng. Chấp nhận: ba bài, và để nguyên là giữ một bug sinh
slug sai vĩnh viễn.

admin-posts.ts tách hẳn khỏi posts.ts — một bên thấy cả nháp, một bên
không. Gộp là mở đường cho ngày bản nháp lọt ra trang công khai.

published_at chỉ ghi ở lần đăng đầu: gỡ bài sửa lỗi chính tả rồi đăng lại
không được đẩy bài lên đầu trang chủ như bài mới.

Slug của bài đã đăng không đổi theo tiêu đề — đó là địa chỉ công khai.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7: API quản trị bài viết

Spec §6.5.

**Files:**
- Create: `src/app/api/admin/posts/route.ts`
- Create: `src/app/api/admin/posts/[id]/route.ts`
- Create: `src/app/api/admin/posts/[id]/publish/route.ts`
- Modify: `tests/middleware-config.test.ts` (bỏ `.skip`)
- Modify: `tests/route-config.test.ts` (thêm route admin vào danh sách force-dynamic)

**Interfaces:**
- Consumes: `requireSession` (Task 5); toàn bộ `@/lib/admin-posts` (Task 6).
- Produces: hợp đồng HTTP mà Task 8 và 9 gọi:
  - `GET  /api/admin/posts` → `200 { posts: AdminPostRow[] }`
  - `POST /api/admin/posts` body `PostInput` → `201 { post: AdminPostRow }`, `400 { error }` nếu tiêu đề rỗng
  - `GET  /api/admin/posts/{id}` → `200 { post }` | `404`
  - `PUT  /api/admin/posts/{id}` body `PostInput` → `200 { post }` | `404`
  - `DELETE /api/admin/posts/{id}` → `200 { ok: true }` | `404`
  - `POST /api/admin/posts/{id}/publish` → `200 { post }` | `404`
  - `DELETE /api/admin/posts/{id}/publish` (gỡ về nháp) → `200 { post }` | `404`
  - Mọi route: `401 { error: "Chưa đăng nhập" }` khi không có session.

- [ ] **Step 1: Thêm route admin vào test cấu hình route**

Trong `tests/route-config.test.ts`, thêm:

```ts
it("mọi route admin đều force-dynamic", () => {
  /* Route admin đọc D1 và đọc cookie. Prerender lúc build là rò một instance
   * workerd mỗi trang cho tới khi SQLite tranh khoá và build đổ với
   * SQLITE_BUSY — đúng cái bẫy đã tốn cả buổi ở Kế hoạch A. */
  const files = [
    "src/app/api/admin/posts/route.ts",
    "src/app/api/admin/posts/[id]/route.ts",
    "src/app/api/admin/posts/[id]/publish/route.ts",
    "src/app/api/admin/upload/route.ts",
    "src/app/admin/page.tsx",
    "src/app/admin/posts/[id]/page.tsx",
  ];
  const thieu = files.filter(
    (file) => !readFileSync(file, "utf8").includes('export const dynamic = "force-dynamic"'),
  );
  expect(thieu).toEqual([]);
});
```

**Lưu ý:** test này liệt kê cả file của Task 8, 9, 10. Đánh dấu `it.skip` ở Task 7 và bỏ `.skip` ở **Task 10 Step 8**, khi mọi file đã tồn tại. Ghi comment nói rõ trong file.

- [ ] **Step 2: Viết `src/app/api/admin/posts/route.ts`**

```ts
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { adminDb, createPost, listAllPosts, type PostInput } from "@/lib/admin-posts";

export const dynamic = "force-dynamic";

/* Đọc và kiểm hình dạng thân request tại biên. Bên trong lib chỉ nhận PostInput
 * đã sạch — kiểm ở một chỗ, không rải rác. */
async function readInput(request: Request): Promise<PostInput | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (typeof body !== "object" || body === null) return null;
  const { title, summary, tags, bodyMarkdown } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) return null;

  return {
    title: title.trim(),
    summary: typeof summary === "string" ? summary : "",
    tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : [],
    bodyMarkdown: typeof bodyMarkdown === "string" ? bodyMarkdown : "",
  };
}

export async function GET(request: Request) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  return NextResponse.json({ posts: await listAllPosts(await adminDb()) });
}

export async function POST(request: Request) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const input = await readInput(request);
  if (!input) {
    return NextResponse.json({ error: "Bài viết phải có tiêu đề." }, { status: 400 });
  }

  const post = await createPost(await adminDb(), input);
  return NextResponse.json({ post }, { status: 201 });
}
```

- [ ] **Step 3: Viết `src/app/api/admin/posts/[id]/route.ts`**

```ts
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import {
  adminDb,
  deletePost,
  findPostById,
  updatePost,
  type PostInput,
} from "@/lib/admin-posts";

export const dynamic = "force-dynamic";

/* Next 15+ đưa params xuống dưới dạng Promise. Quên await là nhận một object
 * Promise ở chỗ chờ số, và lỗi hiện ra rất xa nơi gây ra nó. */
type Context = { params: Promise<{ id: string }> };

async function readId(context: Context): Promise<number | null> {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function readInput(request: Request): Promise<PostInput | null> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (typeof body !== "object" || body === null) return null;
  const { title, summary, tags, bodyMarkdown } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0) return null;

  return {
    title: title.trim(),
    summary: typeof summary === "string" ? summary : "",
    tags: Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : [],
    bodyMarkdown: typeof bodyMarkdown === "string" ? bodyMarkdown : "",
  };
}

export async function GET(request: Request, context: Context) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const id = await readId(context);
  if (id === null) return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });

  const post = await findPostById(await adminDb(), id);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  return NextResponse.json({ post });
}

export async function PUT(request: Request, context: Context) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const id = await readId(context);
  if (id === null) return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });

  const input = await readInput(request);
  if (!input) {
    return NextResponse.json({ error: "Bài viết phải có tiêu đề." }, { status: 400 });
  }

  const post = await updatePost(await adminDb(), id, input);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  return NextResponse.json({ post });
}

export async function DELETE(request: Request, context: Context) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const id = await readId(context);
  if (id === null) return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });

  if (!(await deletePost(await adminDb(), id))) {
    return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Viết `src/app/api/admin/posts/[id]/publish/route.ts`**

```ts
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { adminDb, setPostStatus } from "@/lib/admin-posts";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/* Tách riêng khỏi PUT vì đăng/gỡ có TÁC DỤNG PHỤ (dọn cache) chứ không chỉ
 * ghi cột. Gộp vào PUT là mỗi lần lưu nháp cũng dọn cache cả site. */
async function doiTrangThai(
  request: Request,
  context: Context,
  status: "draft" | "published",
) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id không hợp lệ" }, { status: 400 });
  }

  const post = await setPostStatus(await adminDb(), id, status);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  /* Bốn đường này đều đọc danh sách bài. Thiếu bất kỳ đường nào là bài mới
   * đăng nhưng không ai thấy — chính xác kiểu lỗi mà "đã deploy rồi mà" không
   * giải thích được. WORKER_SELF_REFERENCE trong wrangler.jsonc là thứ làm
   * revalidatePath có tác dụng; thiếu binding đó thì mấy dòng này là vô nghĩa
   * và không kêu gì cả. */
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ post });
}

export async function POST(request: Request, context: Context) {
  return doiTrangThai(request, context, "published");
}

export async function DELETE(request: Request, context: Context) {
  return doiTrangThai(request, context, "draft");
}
```

- [ ] **Step 5: Bỏ `.skip` ở khối test thứ hai của `tests/middleware-config.test.ts`**

Xoá `.skip` khỏi `describe.skip("mọi route /api/admin đều tự kiểm tra session", …)` và xoá comment giải thích việc skip.

- [ ] **Step 6: Chạy test và build**

Run: `npm test && npm run typecheck && npm run build`
Expected: tất cả xanh. Nếu build đổ với `SQLITE_BUSY`, có route admin nào đó thiếu `force-dynamic` — thêm vào.

- [ ] **Step 7: Kiểm tay bằng preview**

Run: `npm run cf:preview` rồi ở terminal khác:
```bash
curl -i http://localhost:8788/api/admin/posts
```
Expected: `HTTP/1.1 401` và thân `{"error":"Chưa đăng nhập"}`. Nếu nhận 200 kèm danh sách bài, **dừng lại** — đó là lỗ hổng, không phải sự tiện lợi.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/admin tests/middleware-config.test.ts tests/route-config.test.ts
git commit -m "feat: API quản trị bài viết

Đăng/gỡ tách thành route riêng vì chúng có tác dụng phụ (revalidatePath)
chứ không chỉ ghi cột — gộp vào PUT là mỗi lần lưu nháp cũng dọn cache cả
site.

revalidatePath gọi đủ bốn đường (/, /blog, bài, sitemap): thiếu một là bài
mới đăng mà không ai thấy, và không có gì báo lỗi.

Mọi route force-dynamic. Đọc D1 lúc prerender là rò instance workerd cho
tới khi SQLite tranh khoá và build đổ — cái bẫy đã tốn cả buổi ở Kế hoạch A.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8: Khung admin và trang danh sách bài

Spec §6.3 (giao diện dùng được trên điện thoại).

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Modify: `src/app/globals.css` (CSS khu admin)

**Interfaces:**
- Consumes: `listAllPosts`, `adminDb` (Task 6); API `POST /api/admin/posts` (Task 7).
- Produces: đường `/admin` liệt kê bài và có nút tạo bài mới; `/admin/posts/{id}` là đích của mỗi dòng (Task 9 dựng trang đó).

- [ ] **Step 1: Viết `src/app/admin/layout.tsx`**

```tsx
import Link from "next/link";

import { SITE_NAME } from "@/lib/site";

export const metadata = {
  title: "Quản trị",
  /* Khu admin không có gì để công cụ tìm kiếm lập chỉ mục, và có vài thứ
   * không nên lập chỉ mục. Middleware đã chặn, đây là lớp lịch sự thêm. */
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Link className="admin-brand" href="/admin">
          {SITE_NAME} · quản trị
        </Link>
        <nav className="admin-nav">
          <Link href="/">Xem blog</Link>
          {/* form POST chứ không phải <a>: logout qua GET thì một thẻ <img>
              trên trang bất kỳ cũng đá người dùng ra khỏi phiên. */}
          <form action="/api/auth/logout" method="post">
            <button className="admin-link-btn" type="submit">
              Đăng xuất
            </button>
          </form>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Viết `src/app/admin/page.tsx`**

```tsx
import Link from "next/link";

import { adminDb, listAllPosts } from "@/lib/admin-posts";

/* Đọc D1 mỗi lần mở. Prerender ở đây là vừa sai (dữ liệu cũ) vừa làm đổ
 * build — xem comment dài trong src/lib/posts.ts. */
export const dynamic = "force-dynamic";

function ngayGon(value: string | null): string {
  if (!value) return "—";
  return value.slice(0, 10);
}

export default async function AdminHomePage() {
  const posts = await listAllPosts(await adminDb());

  return (
    <>
      <div className="admin-page-head">
        <h1>Bài viết</h1>
        {/* Đây là <form> chứ không phải nút gọi fetch: tạo bài mới là thao tác
            một nhịp, không cần JavaScript, và form POST hoạt động cả khi JS
            chưa tải xong. Route POST /api/admin/posts trả 201 kèm bài mới; ta
            cần chuyển trang nên dùng action riêng bên dưới. */}
        <Link className="admin-btn admin-btn-primary" href="/admin/posts/moi">
          Viết bài mới
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="admin-empty">Chưa có bài nào. Bấm “Viết bài mới” để bắt đầu.</p>
      ) : (
        <ul className="admin-post-list">
          {posts.map((post) => (
            <li key={post.id} className="admin-post-item">
              <Link className="admin-post-title" href={`/admin/posts/${post.id}`}>
                {post.title}
              </Link>
              <span
                className={
                  post.status === "published"
                    ? "admin-badge admin-badge-published"
                    : "admin-badge admin-badge-draft"
                }
              >
                {post.status === "published" ? "Đã đăng" : "Nháp"}
              </span>
              <span className="admin-post-meta">
                Sửa {ngayGon(post.updatedAt)} · Đăng {ngayGon(post.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

- [ ] **Step 3: Thêm CSS khu admin vào `globals.css`**

Thêm vào cuối file. **Chỉ dùng token `--base-*`**, không literal màu:

```css
/* ── Khu quản trị ─────────────────────────────────────────────────────────
 * Thiết kế cho điện thoại trước: spec §6.3 nói rõ phải viết được bài từ điện
 * thoại. Mọi thứ ở đây xếp dọc mặc định và chỉ dàn ngang khi đủ rộng. */

.admin-shell {
  min-height: 100vh;
  background: var(--base-background);
  color: var(--base-foreground);
}

.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--base-border);
  background: var(--base-surface);
}

.admin-brand {
  font-family: var(--font-ui);
  font-weight: 600;
  color: var(--base-foreground);
  text-decoration: none;
}

.admin-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 0.9rem;
}

.admin-nav a,
.admin-link-btn {
  color: var(--base-muted-foreground);
  text-decoration: none;
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.admin-nav a:hover,
.admin-link-btn:hover {
  color: var(--base-foreground);
}

.admin-main {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}

.admin-page-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.admin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 44px là ngưỡng vùng chạm dùng được bằng ngón tay. Nút nhỏ hơn thì trên
   * điện thoại bấm trượt, và đây là giao diện để viết bài trên điện thoại. */
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--base-border);
  border-radius: var(--base-radius-sm);
  background: var(--base-surface);
  color: var(--base-foreground);
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: background var(--base-duration-fast) var(--base-ease);
}

.admin-btn:hover {
  background: var(--base-surface-muted);
}

.admin-btn-primary {
  background: var(--base-primary);
  border-color: var(--base-primary);
  color: var(--base-primary-foreground);
}

.admin-btn-primary:hover {
  background: var(--base-primary);
  filter: brightness(1.1);
}

.admin-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.admin-empty {
  color: var(--base-muted-foreground);
}

.admin-post-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-post-item {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 4px 12px;
  padding: 14px 12px;
  border: 1px solid var(--base-border);
  border-radius: var(--base-radius-sm);
  background: var(--base-surface);
}

.admin-post-title {
  font-weight: 600;
  color: var(--base-foreground);
  text-decoration: none;
}

.admin-post-meta {
  grid-column: 1 / -1;
  font-size: 0.8rem;
  color: var(--base-muted-foreground);
}

.admin-badge {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.admin-badge-published {
  background: color-mix(in srgb, var(--base-success) 18%, transparent);
  color: var(--base-success);
}

.admin-badge-draft {
  background: var(--base-surface-muted);
  color: var(--base-muted-foreground);
}
```

- [ ] **Step 4: Chạy cổng màu và test**

Run: `npm run check:colors && npm test && npm run typecheck && npm run build`
Expected: tất cả xanh. Cổng màu phải bắt được ngay nếu có literal lọt vào CSS admin.

- [ ] **Step 5: Kiểm bằng mắt ở bề ngang điện thoại**

Run: `npm run dev`, mở `http://localhost:3000/admin` (sẽ bị chuyển sang đăng nhập — tạm thời bỏ `matcher` để xem, rồi **nhớ trả lại**), thu cửa sổ còn 375px.
Expected: thanh trên không tràn, nút "Viết bài mới" cao ít nhất 44px, danh sách đọc được. Đổi theme sang tối, kiểm lại.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin src/app/globals.css
git commit -m "feat: khung quản trị và danh sách bài

Thiết kế cho điện thoại trước — spec nói rõ phải viết được bài từ điện
thoại. Nút cao tối thiểu 44px vì dưới ngưỡng đó bấm bằng ngón tay là
trượt.

Đăng xuất là <form method=post> chứ không phải <a>.

Toàn bộ CSS đi qua token --base-*, không literal màu — check:colors chặn.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9: Trình soạn thảo

Spec §6.2 và §6.3. **Ba yêu cầu điện thoại trong §6.3 là bắt buộc, không phải tuỳ chọn:** xem trước là TAB (không phải chia đôi màn hình), tự lưu nháp vào localStorage theo từng phím gõ, nút lưu nháp tách khỏi nút đăng.

**Files:**
- Create: `src/app/admin/posts/[id]/page.tsx`
- Create: `src/components/admin/post-editor.tsx`
- Modify: `src/app/globals.css` (CSS trình soạn thảo)
- Test: `tests/post-editor.test.ts`

**Interfaces:**
- Consumes: `findPostById`, `adminDb` (Task 6); API `POST/PUT /api/admin/posts` và `/publish` (Task 7); `markdownToHtml` từ `@/lib/markdown`.
- Produces: `PostEditor` (client component) với props `{ post: AdminPostRow | null }` — `null` nghĩa là bài mới.

- [ ] **Step 1: Viết test thất bại cho ba yêu cầu điện thoại**

Tạo `tests/post-editor.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const editor = readFileSync("src/components/admin/post-editor.tsx", "utf8");

/* Ba điều này là yêu cầu bắt buộc trong spec §6.3, không phải gợi ý. Chúng dễ
 * bị cắt trong lúc làm cho "xong", nên khoá bằng test. */
describe("yêu cầu dùng trên điện thoại", () => {
  it("xem trước là TAB chứ không chia đôi màn hình", () => {
    /* Chia đôi trên màn 375px là hai cột vô dụng. Bằng chứng là soạn và xem
     * trước loại trừ nhau — render cả hai cùng lúc tức là đã chia màn hình,
     * và khi đó nhánh ba ngôi này không tồn tại. */
    expect(editor).toContain('role="tablist"');
    expect(editor).toMatch(/tab === "soan" \? \(/);
  });

  it("tự lưu nháp vào localStorage", () => {
    /* Trình duyệt điện thoại bị hệ điều hành giết bất cứ lúc nào để lấy RAM.
     * Mất cả bài đang viết là lý do người ta bỏ không viết nữa. */
    expect(editor).toContain("localStorage");
    expect(editor).toContain("setItem");
  });

  it("nút lưu nháp tách khỏi nút đăng", () => {
    /* Một nút làm cả hai việc là sớm muộn đăng nhầm bản chưa xong. */
    expect(editor).toContain("Lưu nháp");
    expect(editor).toContain("Đăng bài");
  });

  it("xem trước dùng chính lib/markdown.ts, không tự render lấy", () => {
    /* Spec §6.2: xem trước phải khớp production từng byte. Viết một bộ render
     * thứ hai cho preview là đảm bảo hai bên trôi khỏi nhau. */
    expect(editor).toContain("@/lib/markdown");
  });

  it("là client component", () => {
    expect(editor).toMatch(/^"use client"/);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run tests/post-editor.test.ts`
Expected: FAIL — file chưa tồn tại.

- [ ] **Step 3: Viết `src/components/admin/post-editor.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { AdminPostRow } from "@/lib/admin-posts";
import { markdownToHtml } from "@/lib/markdown";

type Props = { post: AdminPostRow | null };

type Tab = "soan" | "xem";

function nhapKey(id: number | "moi"): string {
  return `nhap-bai-${id}`;
}

export function PostEditor({ post }: Props) {
  const router = useRouter();
  const id = post?.id ?? "moi";

  const [title, setTitle] = useState(post?.title ?? "");
  const [summary, setSummary] = useState(post?.summary ?? "");
  const [tags, setTags] = useState((post?.tags ?? []).join(", "));
  const [body, setBody] = useState(post?.bodyMarkdown ?? "");
  const [tab, setTab] = useState<Tab>("soan");
  const [previewHtml, setPreviewHtml] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [dangLuu, setDangLuu] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  /* Khôi phục bản nháp cục bộ NGAY khi mở, trước khi người dùng gõ gì. Chạy
   * một lần: nếu có trong deps thì mỗi phím gõ lại ghi đè state bằng bản cũ. */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(nhapKey(id));
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<Record<string, string>>;
      /* Chỉ khôi phục khi bản cục bộ KHÁC bản trên server. Bằng nhau thì
       * không có gì để phục hồi, và hiện thông báo là làm người dùng hoảng. */
      if (parsed.body !== undefined && parsed.body !== (post?.bodyMarkdown ?? "")) {
        setTitle(parsed.title ?? "");
        setSummary(parsed.summary ?? "");
        setTags(parsed.tags ?? "");
        setBody(parsed.body);
        setTrangThai("Đã khôi phục bản nháp chưa lưu trên máy này.");
      }
    } catch {
      /* Chế độ riêng tư chặn localStorage, hoặc dữ liệu cũ hỏng định dạng.
       * Cả hai đều không đáng làm trắng trang soạn thảo. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Tự lưu theo từng phím gõ. Trình duyệt điện thoại bị hệ điều hành giết bất
   * cứ lúc nào để lấy RAM — mất cả bài đang viết là lý do người ta bỏ không
   * viết nữa. Ghi thẳng, không debounce: localStorage đồng bộ và nhanh, còn
   * debounce là để hở đúng cái cửa sổ vài trăm mili giây mà tab bị giết. */
  useEffect(() => {
    try {
      localStorage.setItem(
        nhapKey(id),
        JSON.stringify({ title, summary, tags, body }),
      );
    } catch {
      /* Hết dung lượng hoặc bị chặn. Không có gì làm được, và báo lỗi mỗi
       * phím gõ thì tệ hơn im lặng. */
    }
  }, [id, title, summary, tags, body]);

  /* Dựng preview bằng CHÍNH lib/markdown.ts chạy trong trình duyệt. Viết bộ
   * render thứ hai cho preview là đảm bảo có ngày preview và bài thật khác
   * nhau — và người ta chỉ phát hiện sau khi đã đăng. */
  useEffect(() => {
    if (tab !== "xem") return;
    let huy = false;
    markdownToHtml(body).then((html) => {
      if (!huy) setPreviewHtml(html);
    });
    return () => {
      huy = true;
    };
  }, [tab, body]);

  function duLieu() {
    return {
      title,
      summary,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      bodyMarkdown: body,
    };
  }

  async function luuNhap(): Promise<number | null> {
    if (!title.trim()) {
      setTrangThai("Bài viết phải có tiêu đề.");
      return null;
    }

    setDangLuu(true);
    setTrangThai("Đang lưu…");

    const response =
      post === null
        ? await fetch("/api/admin/posts", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(duLieu()),
          })
        : await fetch(`/api/admin/posts/${post.id}`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(duLieu()),
          });

    setDangLuu(false);

    if (!response.ok) {
      const loi = (await response.json().catch(() => ({}))) as { error?: string };
      setTrangThai(loi.error ?? `Lưu thất bại (${response.status}).`);
      return null;
    }

    const { post: saved } = (await response.json()) as { post: AdminPostRow };
    setTrangThai("Đã lưu nháp.");

    /* Đã lưu lên server rồi thì bản cục bộ không còn giá trị; giữ lại là để
     * lần mở sau nó hiện "khôi phục bản chưa lưu" một cách vô cớ. */
    try {
      localStorage.removeItem(nhapKey(id));
    } catch {
      /* Không quan trọng. */
    }

    if (post === null) {
      /* Bài mới đã có id thật — đổi URL để F5 không tạo thêm bài nữa. */
      router.replace(`/admin/posts/${saved.id}`);
    } else {
      router.refresh();
    }

    return saved.id;
  }

  async function dangBai() {
    const savedId = await luuNhap();
    if (savedId === null) return;

    setDangLuu(true);
    setTrangThai("Đang đăng…");
    const response = await fetch(`/api/admin/posts/${savedId}/publish`, {
      method: "POST",
    });
    setDangLuu(false);

    setTrangThai(response.ok ? "Đã đăng." : `Đăng thất bại (${response.status}).`);
    router.refresh();
  }

  async function goVeNhap() {
    if (post === null) return;
    setDangLuu(true);
    const response = await fetch(`/api/admin/posts/${post.id}/publish`, {
      method: "DELETE",
    });
    setDangLuu(false);
    setTrangThai(response.ok ? "Đã gỡ về nháp." : `Gỡ thất bại (${response.status}).`);
    router.refresh();
  }

  /* Chèn Markdown tại đúng vị trí con trỏ. Nối vào cuối thì ảnh luôn rơi
   * xuống đáy bài, và người viết phải tự cắt dán — trên điện thoại là cực
   * hình. Task 10 gọi hàm này. */
  function chenTaiConTro(text: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((truoc) => truoc + text);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setBody((truoc) => truoc.slice(0, start) + text + truoc.slice(end));
    /* Đặt lại con trỏ sau đoạn vừa chèn, ở frame sau khi React đã vẽ xong. */
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + text.length;
    });
  }

  return (
    <div className="editor">
      <div className="editor-fields">
        <label className="editor-label">
          Tiêu đề
          <input
            className="editor-input"
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề bài viết"
            value={title}
          />
        </label>

        <label className="editor-label">
          Tóm tắt
          <input
            className="editor-input"
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Một hai câu hiện ở trang danh sách"
            value={summary}
          />
        </label>

        <label className="editor-label">
          Thẻ
          <input
            className="editor-input"
            onChange={(e) => setTags(e.target.value)}
            placeholder="cách nhau bằng dấu phẩy"
            value={tags}
          />
        </label>
      </div>

      {/* TAB, không chia đôi màn hình: spec §6.3. Hai cột trên màn 375px là
          hai cột vô dụng. */}
      <div className="editor-tabs" role="tablist">
        <button
          aria-selected={tab === "soan"}
          className={tab === "soan" ? "editor-tab editor-tab-active" : "editor-tab"}
          onClick={() => setTab("soan")}
          role="tab"
          type="button"
        >
          Soạn
        </button>
        <button
          aria-selected={tab === "xem"}
          className={tab === "xem" ? "editor-tab editor-tab-active" : "editor-tab"}
          onClick={() => setTab("xem")}
          role="tab"
          type="button"
        >
          Xem trước
        </button>
      </div>

      {tab === "soan" ? (
        <textarea
          className="editor-body"
          onChange={(e) => setBody(e.target.value)}
          placeholder="Viết bằng Markdown…"
          ref={bodyRef}
          value={body}
        />
      ) : (
        /* dangerouslySetInnerHTML ở đây an toàn vì markdownToHtml chạy với
         * sanitize: true — cùng một đường mà bài thật đi qua. Nếu ai đó bỏ cờ
         * sanitize, chỗ này là một trong hai nơi nó thành lỗ hổng. */
        <div
          className="editor-preview article-body"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}

      <div className="editor-actions">
        {/* Hai nút tách hẳn nhau: spec §6.3. Một nút làm cả hai việc là sớm
            muộn đăng nhầm bản chưa xong. */}
        <button className="admin-btn" disabled={dangLuu} onClick={luuNhap} type="button">
          Lưu nháp
        </button>
        <button
          className="admin-btn admin-btn-primary"
          disabled={dangLuu}
          onClick={dangBai}
          type="button"
        >
          Đăng bài
        </button>
        {post?.status === "published" ? (
          <button className="admin-btn" disabled={dangLuu} onClick={goVeNhap} type="button">
            Gỡ về nháp
          </button>
        ) : null}
        <span className="editor-status" role="status">
          {trangThai}
        </span>
      </div>
    </div>
  );
}
```

**Lưu ý cho Task 10:** `chenTaiConTro` hiện chưa có ai gọi. Task 10 gắn nút upload gọi nó. Nếu linter báo "unused", để nguyên — Task 10 sẽ dùng, và xoá rồi thêm lại là công việc thừa.

- [ ] **Step 4: Viết `src/app/admin/posts/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";

import { PostEditor } from "@/components/admin/post-editor";
import { adminDb, findPostById } from "@/lib/admin-posts";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditorPage({ params }: Props) {
  const { id } = await params;

  /* "moi" là đường tạo bài mới, không phải id. Dùng chữ thay vì id=0 để URL
   * đọc được và không nhầm với bài thật. */
  if (id === "moi") {
    return <PostEditor post={null} />;
  }

  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();

  const post = await findPostById(await adminDb(), parsed);
  if (!post) notFound();

  return <PostEditor post={post} />;
}
```

- [ ] **Step 5: Thêm CSS trình soạn thảo**

Thêm vào cuối `globals.css`, **chỉ dùng token**:

```css
/* ── Trình soạn thảo ─────────────────────────────────────────────────────── */

.editor {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.editor-fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--base-muted-foreground);
}

.editor-input,
.editor-body {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--base-border);
  border-radius: var(--base-radius-sm);
  background: var(--base-surface);
  color: var(--base-foreground);
  font-family: var(--font-ui);
  /* 16px là ngưỡng dưới đó Safari trên iOS TỰ PHÓNG TO trang khi ô nhập được
   * chọn, rồi không thu lại. Đừng hạ xuống. */
  font-size: 16px;
}

.editor-input:focus,
.editor-body:focus {
  outline: 2px solid var(--base-primary);
  outline-offset: 1px;
}

.editor-body {
  min-height: 55vh;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  line-height: 1.6;
  resize: vertical;
}

.editor-tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--base-border);
}

.editor-tab {
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--base-muted-foreground);
  font: inherit;
  cursor: pointer;
}

.editor-tab-active {
  color: var(--base-foreground);
  border-bottom-color: var(--base-primary);
}

.editor-preview {
  min-height: 55vh;
  padding: 16px;
  border: 1px solid var(--base-border);
  border-radius: var(--base-radius-sm);
  background: var(--base-surface);
}

.editor-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  /* Dính đáy màn hình: trên điện thoại, textarea cao 55vh đẩy nút xuống dưới
   * vùng nhìn thấy, và người viết phải cuộn hết bài mới bấm được Lưu. */
  position: sticky;
  bottom: 0;
  padding: 12px 0;
  background: var(--base-background);
  border-top: 1px solid var(--base-border);
}

.editor-status {
  font-size: 0.85rem;
  color: var(--base-muted-foreground);
}
```

- [ ] **Step 6: Chạy toàn bộ kiểm tra**

Run: `npm run check:colors && npm test && npm run typecheck && npm run build`
Expected: tất cả xanh, gồm 5 test mới của `post-editor`.

- [ ] **Step 7: Kiểm tự lưu bằng tay — bước này không bỏ được**

Run: `npm run dev`, tạm bỏ `matcher` trong middleware, mở `/admin/posts/moi`, gõ vài câu, **đóng thẳng tab** (không lưu), mở lại cùng URL.
Expected: nội dung trở lại kèm dòng "Đã khôi phục bản nháp chưa lưu trên máy này."
Đây là yêu cầu bắt buộc của spec và không test tĩnh nào chứng minh được nó chạy. **Nhớ trả lại `matcher`.**

- [ ] **Step 8: Commit**

```bash
git add src/components/admin src/app/admin src/app/globals.css tests/post-editor.test.ts
git commit -m "feat: trình soạn thảo Markdown có xem trước, tự lưu, tách nút

Ba yêu cầu bắt buộc của spec §6.3, khoá bằng test vì chúng dễ bị cắt khi
làm cho \"xong\":

- Xem trước là TAB, không chia đôi màn hình. Hai cột trên màn 375px là hai
  cột vô dụng.
- Tự lưu localStorage theo từng phím gõ, không debounce. Trình duyệt điện
  thoại bị hệ điều hành giết bất cứ lúc nào; debounce là để hở đúng cái cửa
  sổ đó.
- Nút Lưu nháp tách khỏi nút Đăng bài. Một nút làm cả hai việc là sớm muộn
  đăng nhầm bản chưa xong.

Xem trước dựng bằng chính lib/markdown.ts chạy trong trình duyệt, nên khớp
bài thật từng byte. Bộ render thứ hai là đảm bảo hai bên trôi khỏi nhau.

Ô nhập để font-size 16px: dưới ngưỡng đó Safari iOS tự phóng to trang rồi
không thu lại.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 10: Upload ảnh lên R2

Spec §6.4.

**Cần người dùng làm trước — agent KHÔNG được tự làm:** bucket `blog-media` phải có tên miền công khai riêng. Việc đó cần ghi DNS, mà token OAuth của wrangler không có quyền đó (đã đo ở lần cắt tên miền). Nếu `MEDIA_BASE_URL` chưa có, **dừng và báo `BLOCKED`** kèm đúng các bước ở Step 1.

**Files:**
- Create: `src/app/api/admin/upload/route.ts`
- Modify: `src/lib/site.ts` (thêm `mediaBaseUrl()`)
- Modify: `src/components/admin/post-editor.tsx` (nút upload)
- Modify: `src/app/globals.css`
- Modify: `next.config.ts` (nếu dùng `next/image` cho ảnh ngoài — xem Step 6)
- Test: `tests/upload-name.test.ts`

**Interfaces:**
- Consumes: `requireSession` (Task 5); `chenTaiConTro` trong `PostEditor` (Task 9); binding R2 `BLOG_MEDIA` (đã có trong `wrangler.jsonc`).
- Produces:
  - `POST /api/admin/upload` — body `multipart/form-data` trường `file` → `201 { url: string }`, `400 { error }`, `401`, `413 { error }`
  - `mediaObjectKey(originalName: string, now?: Date): string` trong `src/lib/media.ts`

- [ ] **Step 1: Kiểm tra điều kiện — nếu chưa có thì BLOCKED**

Chạy: `npx wrangler r2 bucket domain list blog-media`

Nếu chưa có tên miền nào, **dừng** và báo cho người dùng đúng các bước sau (agent không được tự làm — cần quyền ghi DNS):

> Vào Cloudflare Dashboard → R2 → bucket `blog-media` → Settings → Public access → **Connect Custom Domain** → nhập `media-blog.ai-innovation-homelab.org` → Connect.
> Sau đó chạy: `npx wrangler secret put MEDIA_BASE_URL` và nhập `https://media-blog.ai-innovation-homelab.org`

Lý do phục vụ ảnh qua tên miền riêng chứ không qua Worker: mỗi lần tải ảnh qua Worker là một lần gọi Worker tính tiền, trong khi R2 phục vụ trực tiếp thì miễn phí băng thông ra. Ảnh cũng không cần logic gì.

- [ ] **Step 2: Viết test thất bại cho việc đặt tên object**

Tạo `tests/upload-name.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mediaObjectKey } from "@/lib/media";

const NGAY = new Date("2026-09-17T10:30:00Z");

describe("mediaObjectKey", () => {
  it("xếp theo năm/tháng", () => {
    expect(mediaObjectKey("anh.png", NGAY)).toMatch(/^2026\/09\//);
  });

  it("giữ phần mở rộng", () => {
    expect(mediaObjectKey("anh.png", NGAY)).toMatch(/\.png$/);
    expect(mediaObjectKey("So do.JPEG", NGAY)).toMatch(/\.jpeg$/);
  });

  it("bỏ dấu tiếng Việt và khoảng trắng trong tên", () => {
    /* Tên file tiếng Việt có dấu trong URL thành %E1%BA%A3nh… — dài, xấu, và
     * vài client cũ xử lý sai. */
    const key = mediaObjectKey("Ảnh màn hình.png", NGAY);
    expect(key).toMatch(/^2026\/09\/[a-z0-9-]+-[a-z0-9]+\.png$/);
  });

  it("không bao giờ trả cùng một key cho hai lần gọi", () => {
    /* Trùng key là ghi đè ảnh của bài cũ — mất dữ liệu trong im lặng. */
    const a = mediaObjectKey("anh.png", NGAY);
    const b = mediaObjectKey("anh.png", NGAY);
    expect(a).not.toBe(b);
  });

  it("chặn ../ trong tên file", () => {
    /* Tên file đến từ client. "../../secret.png" không được phép trèo ra
     * ngoài tiền tố năm/tháng. */
    const key = mediaObjectKey("../../secret.png", NGAY);
    expect(key).not.toContain("..");
    expect(key.startsWith("2026/09/")).toBe(true);
  });

  it("dự phòng khi tên file không có phần mở rộng", () => {
    expect(mediaObjectKey("khongcoduoi", NGAY)).toMatch(/\.bin$/);
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận đỏ**

Run: `npx vitest run tests/upload-name.test.ts`
Expected: FAIL — `src/lib/media.ts` chưa tồn tại.

- [ ] **Step 4: Viết `src/lib/media.ts`**

```ts
import { toSlug } from "@/lib/article-toc";

/* Giới hạn 5 MB. Ảnh chụp màn hình và ảnh minh hoạ blog không vượt quá mức
 * này; vượt là dấu hiệu ảnh chưa nén, hoặc là ai đó đang dùng bucket làm nơi
 * chứa file. R2 tính tiền theo dung lượng lưu. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/* Danh sách cho phép, không phải danh sách cấm: kiểu file mới xuất hiện thì
 * mặc định bị từ chối chứ không mặc định được nhận. */
export const ALLOWED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export function mediaObjectKey(originalName: string, now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  /* basename: cắt mọi thành phần đường dẫn. Tên file đến từ client, và
   * "../../x.png" không được phép trèo ra ngoài tiền tố năm/tháng. */
  const base = originalName.split(/[/\\]/).pop() ?? "";
  const dotAt = base.lastIndexOf(".");

  const rawExt = dotAt > 0 ? base.slice(dotAt + 1).toLowerCase() : "";
  const ext = /^[a-z0-9]{1,8}$/.test(rawExt) ? rawExt : "bin";

  const stem = toSlug(dotAt > 0 ? base.slice(0, dotAt) : base) || "anh";

  /* Hậu tố ngẫu nhiên là thứ bảo đảm không trùng. Hai lần upload cùng một tên
   * file mà trùng key là ghi đè ảnh của bài cũ — mất dữ liệu trong im lặng. */
  const unique = crypto.randomUUID().replace(/-/g, "").slice(0, 10);

  return `${year}/${month}/${stem}-${unique}.${ext}`;
}
```

- [ ] **Step 5: Chạy test, xác nhận xanh**

Run: `npx vitest run tests/upload-name.test.ts`
Expected: 6 test PASS.

- [ ] **Step 6: Viết route upload**

Tạo `src/app/api/admin/upload/route.ts`:

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/auth";
import { ALLOWED_MEDIA_TYPES, MAX_UPLOAD_BYTES, mediaObjectKey } from "@/lib/media";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await requireSession(request))) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { env } = await getCloudflareContext({ async: true });

  const mediaBase = (env as unknown as Record<string, string>).MEDIA_BASE_URL;
  if (!mediaBase) {
    /* Không có tên miền công khai thì upload thành công cũng vô dụng: ta có
     * object trong bucket mà không có URL để chèn vào bài. Từ chối sớm còn
     * hơn để ảnh nằm mồ côi trong R2. */
    return NextResponse.json(
      { error: "Chưa cấu hình MEDIA_BASE_URL cho bucket ảnh." },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Body không phải multipart form." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu trường file." }, { status: 400 });
  }

  if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Không nhận kiểu file ${file.type || "không rõ"}.` },
      { status: 400 },
    );
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File ${(file.size / 1024 / 1024).toFixed(1)} MB, tối đa 5 MB.` },
      { status: 413 },
    );
  }

  const key = mediaObjectKey(file.name);

  await env.BLOG_MEDIA.put(key, file.stream(), {
    httpMetadata: {
      /* Dùng file.type đã qua danh sách cho phép ở trên, KHÔNG dùng thẳng
       * chuỗi client gửi. Nếu không, một file .html gắn nhãn image/png vẫn
       * được R2 trả về với Content-Type do client chọn. */
      contentType: file.type,
      /* Ảnh có tên duy nhất nên không bao giờ thay đổi nội dung — cache vĩnh
       * viễn là an toàn và miễn phí. */
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return NextResponse.json(
    { url: `${mediaBase.replace(/\/$/, "")}/${key}` },
    { status: 201 },
  );
}
```

- [ ] **Step 7: Gắn nút upload vào trình soạn thảo**

Trong `src/components/admin/post-editor.tsx`, thêm state và hàm ngay trước phần `return`:

```tsx
  const fileRef = useRef<HTMLInputElement>(null);

  async function taiAnh(file: File) {
    setTrangThai("Đang tải ảnh…");
    const form = new FormData();
    form.append("file", file);

    const response = await fetch("/api/admin/upload", { method: "POST", body: form });

    if (!response.ok) {
      const loi = (await response.json().catch(() => ({}))) as { error?: string };
      setTrangThai(loi.error ?? `Tải ảnh thất bại (${response.status}).`);
      return;
    }

    const { url } = (await response.json()) as { url: string };
    /* Chèn tại con trỏ, không nối vào cuối: nối vào cuối thì ảnh luôn rơi
     * xuống đáy bài và người viết phải tự cắt dán — trên điện thoại là cực
     * hình. */
    chenTaiConTro(`\n\n![](${url})\n\n`);
    setTrangThai("Đã chèn ảnh.");
  }
```

Rồi trong khối `editor-actions`, ngay trước nút "Lưu nháp", thêm:

```tsx
        <input
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="editor-file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void taiAnh(file);
            /* Xoá giá trị để chọn lại CÙNG file lần nữa vẫn kích hoạt
               onChange — nếu không, upload hỏng lần một là không thử lại được
               mà không hiểu vì sao. */
            e.target.value = "";
          }}
          ref={fileRef}
          type="file"
        />
        <button
          className="admin-btn"
          disabled={dangLuu}
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          Chèn ảnh
        </button>
```

Và thêm CSS vào `globals.css`:

```css
/* Ẩn ô chọn file gốc nhưng vẫn để nó nằm trong luồng bàn phím: display:none
   là cắt nó khỏi cây khả truy cập luôn. */
.editor-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
```

- [ ] **Step 8: Bỏ `.skip` ở test cấu hình route**

Trong `tests/route-config.test.ts`, xoá `.skip` khỏi `it.skip("mọi route admin đều force-dynamic", …)` — giờ mọi file trong danh sách đã tồn tại.

- [ ] **Step 9: Chạy toàn bộ kiểm tra**

Run: `npm run check:colors && npm test && npm run typecheck && npm run build`
Expected: tất cả xanh.

- [ ] **Step 10: Kiểm bằng tay với preview có R2 thật**

Run: `npm run cf:preview`, đăng nhập, mở một bài, bấm "Chèn ảnh", chọn một ảnh PNG.
Expected: Markdown `![](https://media-blog…/2026/09/…png)` xuất hiện **tại vị trí con trỏ**, và mở URL đó trong tab mới thì thấy ảnh.
Rồi thử với một file `.txt` đổi tên thành `.png`: phải nhận lỗi 400, không được upload.

- [ ] **Step 11: Commit**

```bash
git add src/lib/media.ts src/app/api/admin/upload src/components/admin/post-editor.tsx src/app/globals.css tests/upload-name.test.ts tests/route-config.test.ts
git commit -m "feat: upload ảnh lên R2, chèn tại con trỏ

Ảnh phục vụ qua tên miền riêng gắn vào bucket, không qua Worker: mỗi lần
tải ảnh qua Worker là một lần gọi tính tiền, còn R2 trả trực tiếp thì
băng thông ra miễn phí. Ảnh cũng chẳng cần logic gì.

Danh sách kiểu file CHO PHÉP chứ không phải danh sách cấm — kiểu mới xuất
hiện thì mặc định bị từ chối.

Key object có hậu tố ngẫu nhiên: trùng key là ghi đè ảnh bài cũ, mất dữ
liệu trong im lặng. Tên file được cắt basename trước, vì \"../../x.png\"
đến từ client.

Chèn tại con trỏ chứ không nối cuối bài — nối cuối thì phải tự cắt dán,
trên điện thoại là cực hình.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 11: Deploy tự động

Spec §7.1 — thứ tự bắt buộc: `lint → typecheck → test → d1 migrations apply --remote → build → populateCache → deploy → smoke`.

**Cần người dùng làm trước:** hai GitHub secret. Agent **không được** tạo API token Cloudflare — báo `BLOCKED` kèm hướng dẫn ở Step 1 nếu chưa có.

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`
- Modify: `scripts/smoke.mjs` (thêm kiểm `/admin` phải chuyển hướng)
- Modify: `docs/superpowers/ke-hoach-a-ban-giao.md` → viết bàn giao Kế hoạch B

**Interfaces:**
- Consumes: mọi thứ đã làm.
- Produces: đẩy lên `main` là tự động deploy.

- [ ] **Step 1: Kiểm tra secret — nếu chưa có thì BLOCKED**

Chạy: `gh secret list --repo dungca1512/dungca-blog`

Nếu thiếu `CLOUDFLARE_API_TOKEN` hoặc `CLOUDFLARE_ACCOUNT_ID`, **dừng** và báo người dùng:

> 1. Cloudflare Dashboard → My Profile → API Tokens → Create Token → template **Edit Cloudflare Workers**, thêm quyền `D1:Edit` và `Workers R2 Storage:Edit`.
> 2. `gh secret set CLOUDFLARE_API_TOKEN --repo dungca1512/dungca-blog` rồi dán token.
> 3. `gh secret set CLOUDFLARE_ACCOUNT_ID --repo dungca1512/dungca-blog` rồi dán account ID (thấy ở góc phải Dashboard).

- [ ] **Step 2: Bổ sung `ci.yml`**

Thêm hai bước, đặt **trước** bước Build:

```yaml
      - name: Typecheck
        run: npm run typecheck

      # Chặn literal màu lọt ra ngoài lớp token. Không có cổng này thì một hex
      # lẻ nằm im trong component, không lật theo theme, và không ai biết.
      - name: Check colors
        run: npm run check:colors
```

- [ ] **Step 3: Thêm kiểm `/admin` vào smoke**

Trong `scripts/smoke.mjs`, sau vòng lặp `ROUTES`, thêm:

```js
/* Khu quản trị phải ĐÓNG với người chưa đăng nhập. Đây là kiểm tra bảo mật
   chạy trên production thật sau mỗi lần deploy — một middleware matcher viết
   sai không kêu ở bất kỳ đâu khác. */
{
  const res = await fetch(`${base}/admin`, { redirect: "manual" });
  /* 3xx = chuyển sang đăng nhập (đúng). 200 = trang quản trị mở toang. */
  if (res.status >= 300 && res.status < 400) {
    console.log(`✓ /admin — chuyển hướng ${res.status}, chưa đăng nhập không vào được`);
  } else {
    console.error(`✗ /admin — nhận ${res.status}, phải chuyển hướng sang đăng nhập`);
    failed += 1;
  }
}

{
  const res = await fetch(`${base}/api/admin/posts`, { redirect: "manual" });
  if (res.status === 401) {
    console.log(`✓ /api/admin/posts — 401`);
  } else {
    console.error(`✗ /api/admin/posts — nhận ${res.status}, phải là 401`);
    failed += 1;
  }
}
```

- [ ] **Step 4: Chạy smoke với bản preview để xác nhận hai kiểm mới**

Run: `npm run cf:preview` ở một terminal, rồi `npm run smoke` ở terminal khác.
Expected: cả hai dòng mới đều `✓`. Nếu `/admin` trả 200, dừng lại — đó là lỗ hổng.

- [ ] **Step 5: Viết `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: ["main"]
  # Cho phép chạy tay khi cần deploy lại mà không có commit mới.
  workflow_dispatch:

# Hai lần đẩy liên tiếp không được deploy song song: bản cũ hơn có thể về đích
# sau và ghi đè bản mới. Huỷ bản đang chạy khi có bản mới tới.
concurrency:
  group: deploy-production
  cancel-in-progress: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      # Ba cổng chất lượng chạy TRƯỚC khi chạm vào production. Chạy sau là
      # phát hiện lỗi khi nó đã ở trên mạng.
      - name: Lint
        run: npm run lint

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test

      - name: Check colors
        run: npm run check:colors

      # Migration chạy TRƯỚC deploy, không phải sau. Code mới đọc cột chưa tồn
      # tại là mọi trang đổ; code cũ chạy với cột thừa thì không sao. Đây là lý
      # do migration chỉ được phép CỘNG THÊM, không đổi tên, không xoá.
      - name: Apply D1 migrations
        run: npx wrangler d1 migrations apply dungca-blog --remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      # build → populateCache → deploy, đúng thứ tự này. Bỏ populateCache là
      # MỌI bài trả 404 kèm NoFallbackError trong khi log build vẫn xanh — đã
      # xảy ra thật ở giai đoạn spike.
      - name: Build
        run: npx opennextjs-cloudflare build

      - name: Populate cache
        run: npx opennextjs-cloudflare populateCache remote
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      - name: Deploy
        run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}

      # Bước quan trọng nhất của file này. "Deploy thành công" chỉ nói wrangler
      # tải code lên được; nó không nói trang nào mở được. Smoke gọi vào tên
      # miền thật và là thứ duy nhất ở đây kiểm chứng điều đó.
      - name: Smoke test production
        run: npm run smoke https://blog-dungca.ai-innovation-homelab.org
```

- [ ] **Step 6: Kiểm cú pháp workflow trước khi đẩy**

Run: `npx --yes @action-validator/cli --verbose .github/workflows/deploy.yml 2>/dev/null || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('YAML hợp lệ')"`
Expected: báo hợp lệ. Cú pháp YAML sai chỉ lộ ra sau khi đẩy, và lúc đó là một lần chạy hỏng trên `main`.

- [ ] **Step 7: Viết bàn giao Kế hoạch B**

Tạo `docs/superpowers/ke-hoach-b-ban-giao.md` theo đúng khuôn của `ke-hoach-a-ban-giao.md`, gồm:
- Đường đăng nhập: mở `/admin` → chuyển sang GitHub → quay về → viết bài.
- Ba secret phải có trên Worker (`wrangler secret list` để kiểm) và **cách quay lại khi mất quyền vào**: `wrangler secret put SESSION_SECRET` với giá trị mới sẽ đá mọi session ra, kể cả session bị chiếm.
- Hai GitHub secret cho deploy.
- Tên miền ảnh và lý do nó tách khỏi Worker.
- Cách rollback: `npx wrangler versions list` rồi `npx wrangler rollback --version-id <id>`. Nhắc rằng rollback KHÔNG lùi migration D1 — đó là lý do migration chỉ được cộng thêm.
- Nhắc `toSlug` đã đổi ở Task 6 và neo tiêu đề của bài cũ đã khác.

- [ ] **Step 8: Chạy toàn bộ lần cuối**

Run: `npm run verify`
Expected: lint, typecheck, test, check:colors, build — tất cả xanh.

- [ ] **Step 9: Commit và đẩy**

```bash
git add .github/workflows scripts/smoke.mjs docs/superpowers/ke-hoach-b-ban-giao.md
git commit -m "ci: deploy tự động lên Cloudflare Workers

Thứ tự bắt buộc: lint → typecheck → test → migration → build →
populateCache → deploy → smoke.

Migration chạy TRƯỚC deploy: code mới đọc cột chưa tồn tại là mọi trang
đổ, còn code cũ chạy với cột thừa thì không sao. Cũng là lý do migration
chỉ được cộng thêm, không đổi tên, không xoá.

populateCache không bỏ được: thiếu nó thì mọi bài trả 404 kèm
NoFallbackError trong khi log build vẫn xanh — đã xảy ra thật.

Smoke chạy vào tên miền thật sau deploy, và giờ kiểm cả việc /admin đóng
với người chưa đăng nhập. \"Deploy thành công\" chỉ nói wrangler tải code
lên được, không nói trang nào mở được.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git push
```

- [ ] **Step 10: Xem lần chạy đầu tiên**

Run: `gh run watch`
Expected: mọi bước xanh, bước smoke in `✓` cho toàn bộ đường dẫn kể cả hai kiểm bảo mật mới.
Nếu smoke đỏ mà deploy xanh: **đó chính là kiểu lỗi cả kế hoạch này tồn tại để bắt.** Đọc dòng `✗`, sửa, đẩy lại. Không tắt smoke.

- [ ] **Step 11: Kiểm bằng tay trên production — nghiệm thu thật sự**

Trên **điện thoại**, mở `https://blog-dungca.ai-innovation-homelab.org/admin`:
1. Bị chuyển sang GitHub, đồng ý, quay về `/admin`.
2. Bấm "Viết bài mới", gõ tiêu đề tiếng Việt có chữ Đ, gõ vài đoạn.
3. Chèn một ảnh chụp màn hình.
4. Bấm "Xem trước", kiểm nội dung hiển thị đúng.
5. Bấm "Lưu nháp", đóng tab, mở lại — nội dung còn nguyên.
6. Bấm "Đăng bài", mở trang chủ ở tab ẩn danh — bài phải có mặt.

Đây là lúc yêu cầu gốc của người dùng được đáp ứng: *"blog mà tôi có thể đăng nhập và viết bài thẳng trên đó"*. Mọi thứ trước bước này chỉ là chuẩn bị.

---

## Ghi chú cho người thực thi

**Thứ tự task không đổi được.** Task 1 phải trước 8 và 9 (nếu không phải sơn lại giao diện). Task 3 trước 4 trước 5. Task 6 trước 7 trước 9. Task 10 cần `chenTaiConTro` từ Task 9.

**Ba chỗ dùng `.skip` rồi bỏ sau** — dễ quên, nên ghi lại ở đây:
| File | Skip ở | Bỏ skip ở |
|---|---|---|
| `tests/middleware-config.test.ts`, khối "mọi route /api/admin đều tự kiểm tra session" | Task 5 Step 1 | Task 7 Step 5 |
| `tests/route-config.test.ts`, case "mọi route admin đều force-dynamic" | Task 7 Step 1 | Task 10 Step 8 |

**Hai chỗ phải báo `BLOCKED` chứ không tự làm:** Task 10 Step 1 (tên miền R2, cần ghi DNS) và Task 11 Step 1 (API token Cloudflare).

**Hai lần phải tạm bỏ `matcher` để xem giao diện** (Task 8 Step 5, Task 9 Step 7). Cả hai lần đều phải trả lại. Nếu commit lọt một middleware không có matcher, smoke ở Task 11 sẽ bắt được — nhưng lúc đó nó đã ở trên production một lúc rồi.

**Khi một task hỏng mà không hiểu vì sao,** đọc `docs/superpowers/ke-hoach-a-ban-giao.md` trước. Hai cái bẫy đắt nhất của dự án này (bỏ `populateCache`, và đọc D1 lúc build) đều nằm ở đó, và cả hai đều biểu hiện dưới dạng "build xanh nhưng site hỏng".
