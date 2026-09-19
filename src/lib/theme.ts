/* Ba chế độ, không phải hai. "system" là mặc định và là thứ duy nhất tôn
 * trọng cài đặt sáng/tối của máy — hai chế độ kia là người dùng cố ý ghi đè
 * cho riêng trang này. */
export type ThemeMode = "system" | "light" | "dark";

/* Khoá dùng chung với script chống nháy trong layout.tsx. Đổi ở một nơi mà
 * quên nơi kia là theme bị quên giữa hai lần tải trang. */
export const THEME_STORAGE_KEY = "theme";

/* Chỉ đúng hai chuỗi này là lựa chọn tay hợp lệ — trùng với giá trị bản cũ
 * từng ghi, nên người đã chọn tối vẫn ở tối sau khi nâng cấp. Mọi thứ khác
 * (thiếu khoá, chuỗi rỗng, giá trị rác, "system") đều là theo hệ thống. */
export function docCheDo(raw: string | null): ThemeMode {
  return raw === "dark" || raw === "light" ? raw : "system";
}

export function cheDoKeTiep(mode: ThemeMode): ThemeMode {
  if (mode === "system") return "light";
  return mode === "light" ? "dark" : "system";
}

/* null nghĩa là GỠ data-theme khỏi <html>, không phải đặt nó bằng chuỗi rỗng.
 * Chỉ khi thuộc tính vắng mặt thì @media (prefers-color-scheme: dark) trong
 * globals.css mới lên tiếng — và đó là thứ khiến trang đổi theo máy ngay giữa
 * phiên, không cần JS ngồi nghe. */
export function thuocTinhTheme(mode: ThemeMode): string | null {
  return mode === "system" ? null : mode;
}

export function nhanCheDo(mode: ThemeMode): { icon: string; nhan: string } {
  if (mode === "system") {
    return { icon: "◐", nhan: "Giao diện theo hệ thống. Chuyển sang giao diện sáng" };
  }
  if (mode === "light") {
    return { icon: "☀", nhan: "Giao diện sáng. Chuyển sang giao diện tối" };
  }
  return { icon: "☾", nhan: "Giao diện tối. Chuyển sang theo hệ thống" };
}
