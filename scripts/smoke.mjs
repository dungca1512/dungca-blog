/* Build xanh không phải bằng chứng site chạy. Trong spike, build báo thành
   công trong khi mọi trang bài viết trả 404 kèm NoFallbackError, vì bước
   populateCache bị bỏ qua. Script này là thứ bắt được chuyện đó. */
const base = (process.argv[2] ?? "http://localhost:8788").replace(/\/$/, "");

const ROUTES = [
  "/",
  "/blog/",
  "/projects/",
  "/blog/bai-thu-nghiem/",
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
