/* Một file duy nhất sở hữu màu. Mọi chỗ khác đi qua token, để đổi palette là
   một lần sửa, và để dark mode không bị bỏ quên ở một xó nào đó — một hex
   không lật theo theme, và không có gì cảnh báo bạn cả. */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

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

/* fs.globSync chỉ có từ Node 22. CI của repo này ghim node-version: 20
 * (.github/workflows/ci.yml), nên gọi globSync ở đây sẽ ném "globSync is not
 * a function" ngay khi Task 11 đưa check:colors vào CI — cổng đỏ vĩnh viễn vì
 * lý do sai, không phải vì có màu hardcode. Duyệt cây thư mục bằng tay bằng
 * readdirSync để chạy được trên Node 20. Đừng "tối ưu" nó về globSync lại. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(path));
    } else if (entry.isFile()) {
      out.push(path);
    }
  }
  return out;
}

const files = walk("src")
  .map((f) => f.split("\\").join("/")) // Windows: chuẩn hoá dấu phân cách để so khớp ALLOWED ổn định.
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
