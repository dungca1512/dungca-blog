"use client";

import { useSyncExternalStore } from "react";

import {
  cheDoKeTiep,
  docCheDo,
  nhanCheDo,
  thuocTinhTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from "@/lib/theme";

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

/* Nguồn sự thật là localStorage, không phải data-theme trên <html>: ở chế độ
 * hệ thống thuộc tính đó cố tình vắng mặt, nên đọc nó thì không phân biệt
 * được "theo hệ thống, đang sáng" với "người dùng chọn sáng". */
function docCheDoHienTai(): ThemeMode {
  try {
    return docCheDo(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    /* Chế độ riêng tư chặn localStorage. Coi như chưa chọn gì. */
    return "system";
  }
}

/* Server không có localStorage nên phải có một giá trị dựng HTML tĩnh. React
 * chỉ dùng nó ở pha hydrate — để HTML client khớp HTML server — rồi render
 * lại ngay bằng docCheDoHienTai(). Khi đó HTML và state của client khớp nhau
 * ngay từ đầu, không bị kẹt icon và nhãn ngược vĩnh viễn. */
function docCheDoTrenServer(): ThemeMode {
  return "system";
}

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, docCheDoHienTai, docCheDoTrenServer);
  const { icon, nhan } = nhanCheDo(mode);

  function toggle() {
    const next = cheDoKeTiep(mode);
    const thuocTinh = thuocTinhTheme(next);

    if (thuocTinh === null) {
      /* GỠ hẳn, không đặt chuỗi rỗng: chỉ khi <html> không có data-theme thì
       * @media (prefers-color-scheme) trong globals.css mới quyết định màu —
       * và khi đó đổi cài đặt của máy là trang đổi theo ngay, không cần tải
       * lại và không cần JS ngồi nghe. */
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.dataset.theme = thuocTinh;
    }

    try {
      if (next === "system") {
        /* Vắng khoá = theo hệ thống. Cùng một quy ước với script chống nháy,
         * nên không có giá trị thứ ba nào cần ai đó nhớ. */
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      }
    } catch {
      /* Chế độ riêng tư chặn localStorage. Theme vẫn đổi cho phiên này; chỉ
       * là không nhớ được. Không đáng làm đổ nút. */
    }

    for (const baoDoi of nguoiNghe) baoDoi();
  }

  return (
    <button aria-label={nhan} className="icon-btn" onClick={toggle} title={nhan} type="button">
      {icon}
    </button>
  );
}
