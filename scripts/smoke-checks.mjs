/* Phần thuần logic của smoke, tách ra để test được: smoke.mjs chạy ngay khi
   import nên không import được từ test. */

function duongDan(loc) {
  try {
    return decodeURIComponent(new URL(loc).pathname);
  } catch {
    return "";
  }
}

/* So sitemap với danh sách slug ĐÃ ĐĂNG thật, không phải với hình dạng URL.
   Kiểm theo hình dạng vẫn xanh khi sitemap còn đúng một bài cũ trong lúc D1
   đã có mười bài mới — tức là mù đúng cái lỗi nó phải bắt. */
export function slugThieuTrongSitemap(locs, slugs) {
  const coSan = new Set(
    locs
      .map(duongDan)
      .filter((path) => path.startsWith("/blog/"))
      .map((path) => path.slice("/blog/".length).replace(/\/$/, "")),
  );

  return slugs.filter((slug) => !coSan.has(slug));
}

/* Lấy các URL thuộc một nhánh (/blog/, /projects/), bỏ chính trang danh
   sách. Dùng để mở thử một URL do sitemap khai ra thay vì một slug đóng
   cứng trong script — slug đóng cứng chết ngay khi bài đó bị xoá. */
export function locTheoTienTo(locs, tienTo) {
  return locs.filter((loc) => {
    const path = duongDan(loc);
    return path.startsWith(tienTo) && path.replace(/\/$/, "").length > tienTo.length;
  });
}
