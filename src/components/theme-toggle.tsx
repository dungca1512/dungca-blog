"use client";

import { useState } from "react";

type Theme = "light" | "dark";

/* Khoá này dùng chung với script chống nháy trong layout.tsx. Đổi ở một nơi
 * mà quên nơi kia là theme bị quên giữa hai lần tải trang. */
const STORAGE_KEY = "theme";

/* Trên server không có document, trả "light" làm giá trị dựng HTML tĩnh —
 * không dùng để hiển thị thật vì trình duyệt không bao giờ render pha này.
 * Trên trình duyệt, script chống nháy trong layout.tsx đã đặt xong
 * data-theme trước khi React hydrate, nên đọc thẳng ở đây cho icon đúng
 * ngay từ khung hình đầu tiên — không cần useEffect nào cả. Đổi thứ này
 * sang useEffect sẽ vừa gây chớp icon sai một nhịp, vừa bị eslint
 * (react-hooks/set-state-in-effect) đánh rớt vì gọi setState vô điều kiện
 * trong effect. */
function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

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
      /* Giá trị ban đầu ở client (đọc từ DOM) có thể khác giá trị server
         render ra ("light" cố định) khi người dùng đã chọn tối từ trước —
         y hệt lý do <html> ở layout.tsx cần cờ này. */
      suppressHydrationWarning
      type="button"
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}
