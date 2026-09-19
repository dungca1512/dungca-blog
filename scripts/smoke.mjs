/* Build xanh không phải bằng chứng site chạy. Trong spike, build báo thành
   công trong khi mọi trang bài viết trả 404 kèm NoFallbackError, vì bước
   populateCache bị bỏ qua. Script này là thứ bắt được chuyện đó. */
import { locTheoTienTo, slugThieuTrongSitemap } from "./smoke-checks.mjs";

const base = (process.argv[2] ?? "http://localhost:8788").replace(/\/$/, "");

const ROUTES = ["/", "/blog/", "/projects/", "/sitemap.xml", "/robots.txt"];

let tong = 0;
let failed = 0;

function qua(thongDiep) {
  tong += 1;
  console.log(`✓ ${thongDiep}`);
}

function hong(thongDiep) {
  tong += 1;
  failed += 1;
  console.error(`✗ ${thongDiep}`);
}

async function kiem200(url, ten) {
  let status = 0;
  try {
    const res = await fetch(url, { redirect: "follow" });
    status = res.status;
  } catch (error) {
    hong(`${ten} — không gọi được: ${error.message}`);
    return;
  }

  if (status === 200) {
    qua(ten);
  } else {
    hong(`${ten} — nhận ${status}, cần 200`);
  }
}

for (const route of ROUTES) {
  await kiem200(`${base}${route}`, route);
}

/* Chỉ kiểm status 200 không đủ: sitemap từng trả 200 với nội dung rỗng vì
   gọi getAllProjects() (đọc node:fs) từ route force-dynamic chạy trong
   Worker — không ai thấy vì lỗi bị nuốt và không lộ ra ở mã trạng thái.
   Kiểm nội dung để bắt đúng kiểu lỗi "200 nhưng rỗng" đó. */
let locs = [];

try {
  const res = await fetch(`${base}/sitemap.xml`);
  const body = await res.text();
  locs = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
} catch (error) {
  hong(`sitemap.xml — không đọc được nội dung: ${error.message}`);
}

const blogLocs = locTheoTienTo(locs, "/blog/");
const projectLocs = locTheoTienTo(locs, "/projects/");

if (blogLocs.length > 0) {
  qua("sitemap.xml chứa ít nhất một /blog/<slug>/");
} else {
  hong("sitemap.xml không có URL /blog/<slug>/ nào");
}

if (projectLocs.length > 0) {
  qua("sitemap.xml chứa ít nhất một /projects/<slug>/");
} else {
  hong("sitemap.xml không có URL /projects/<slug>/ nào");
}

/* Đối chiếu sitemap với NGUỒN THẬT (bài đã đăng trong D1, đọc qua chỉ mục
   tìm kiếm). Kiểm theo hình dạng URL ở trên vẫn xanh khi sitemap còn đúng
   một bài cũ trong lúc D1 đã có mười bài mới. */
try {
  const res = await fetch(`${base}/api/search-index`);
  const data = await res.json();

  if (!Array.isArray(data)) {
    hong("/api/search-index không trả mảng — không đối chiếu được slug");
  } else {
    const slugs = data.map((post) => post.slug);
    const thieu = slugThieuTrongSitemap(locs, slugs);

    if (thieu.length === 0) {
      qua(`sitemap.xml có đủ ${slugs.length} slug bài đã đăng`);
    } else {
      hong(`sitemap.xml thiếu ${thieu.length} slug đã đăng: ${thieu.join(", ")}`);
    }
  }
} catch (error) {
  hong(`/api/search-index — không đối chiếu được slug: ${error.message}`);
}

/* Mở thật một URL do chính sitemap khai ra. Trước đây script đóng cứng
   /blog/2026-03-03-khoi-tao-blog/ — xoá bài đó là smoke đỏ oan, mà bài mới
   hỏng thì smoke vẫn xanh. */
if (blogLocs.length > 0) {
  await kiem200(blogLocs[0], `mở bài thật từ sitemap: ${new URL(blogLocs[0]).pathname}`);
}

if (projectLocs.length > 0) {
  await kiem200(
    projectLocs[0],
    `mở dự án thật từ sitemap: ${new URL(projectLocs[0]).pathname}`,
  );
}

/* Khu quản trị phải ĐÓNG với người chưa đăng nhập. Đây là kiểm tra bảo mật
   chạy trên production thật sau mỗi lần deploy — một middleware matcher viết
   sai không kêu ở bất kỳ đâu khác. */
{
  const res = await fetch(`${base}/admin`, { redirect: "manual" });
  /* 3xx = chuyển sang đăng nhập (đúng). 200 = trang quản trị mở toang. */
  if (res.status >= 300 && res.status < 400) {
    qua(`/admin — chuyển hướng ${res.status}, chưa đăng nhập không vào được`);
  } else {
    hong(`/admin — nhận ${res.status}, phải chuyển hướng sang đăng nhập`);
  }
}

{
  const res = await fetch(`${base}/api/admin/posts`, { redirect: "manual" });
  if (res.status === 401) {
    qua("/api/admin/posts — 401");
  } else {
    hong(`/api/admin/posts — nhận ${res.status}, phải là 401`);
  }
}

if (failed > 0) {
  console.error(`\n${failed}/${tong} phép kiểm hỏng.`);
  process.exit(1);
}

console.log(`\n${tong}/${tong} phép kiểm qua.`);
