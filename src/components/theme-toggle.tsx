"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/* Khoá này dùng chung với script chống nháy trong layout.tsx. Đổi ở một nơi
 * mà quên nơi kia là theme bị quên giữa hai lần tải trang. */
const STORAGE_KEY = "theme";

/* Theme là trạng thái của <html>, không của riêng một nút — nên danh sách
 * người nghe nằm ở cấp module. Có hai nút trên cùng trang thì cả hai cùng
 * đổi, không nút nào bị lệch. */
const nguoiNghe = new Set<() => void>();

function subscribe(baoDoi: () => void) {
  nguoiNghe.add(baoDoi);
  return () => {
    nguoiNghe.delete(baoDoi);
  };
}

function docTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/* Server không có document nên phải có một giá trị dựng HTML tĩnh. React chỉ
 * dùng nó ở pha hydrate — để HTML client khớp HTML server — rồi render lại
 * ngay bằng docTheme(). Khi đó HTML và state của client khớp nhau ngay từ đầu,
 * không bị kẹt icon và nhãn ngược vĩnh viễn. */
function docThemeTrenServer(): Theme {
  return "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, docTheme, docThemeTrenServer);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Chế độ riêng tư chặn localStorage. Theme vẫn đổi cho phiên này; chỉ
       * là không nhớ được. Không đáng làm đổ nút. */
    }
    for (const baoDoi of nguoiNghe) baoDoi();
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
