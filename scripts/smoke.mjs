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

/* Chỉ kiểm status 200 không đủ: sitemap từng trả 200 với nội dung rỗng vì
   gọi getAllProjects() (đọc node:fs) từ route force-dynamic chạy trong
   Worker — không ai thấy vì lỗi bị nuốt và không lộ ra ở mã trạng thái.
   Kiểm nội dung để bắt đúng kiểu lỗi "200 nhưng rỗng" đó. */
let sitemapChecks = 0;

try {
  const res = await fetch(`${base}/sitemap.xml`);
  const body = await res.text();
  const locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

  sitemapChecks += 1;
  const hasProjectSlug = locs.some((loc) => /\/projects\/[^/]+\/$/.test(loc));
  if (hasProjectSlug) {
    console.log("✓ sitemap.xml chứa ít nhất một /projects/<slug>/");
  } else {
    console.error("✗ sitemap.xml không có URL /projects/<slug>/ nào");
    failed += 1;
  }

  sitemapChecks += 1;
  const hasBlogSlug = locs.some((loc) => /\/blog\/[^/]+\/$/.test(loc));
  if (hasBlogSlug) {
    console.log("✓ sitemap.xml chứa ít nhất một /blog/<slug>/");
  } else {
    console.error("✗ sitemap.xml không có URL /blog/<slug>/ nào");
    failed += 1;
  }
} catch (error) {
  console.error(`✗ sitemap.xml — không kiểm được nội dung: ${error.message}`);
  sitemapChecks += 2;
  failed += 2;
}

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

const totalChecks = ROUTES.length + sitemapChecks + 2;

if (failed > 0) {
  console.error(`\n${failed}/${totalChecks} phép kiểm hỏng.`);
  process.exit(1);
}

console.log(`\n${totalChecks}/${totalChecks} phép kiểm qua.`);
