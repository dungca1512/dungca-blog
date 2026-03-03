"use client";

import { useEffect, useState } from "react";

export function FloatingNavControls() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      const root = document.documentElement;
      const scrollY = window.scrollY;
      const maxScroll = root.scrollHeight - root.clientHeight;
      const remaining = maxScroll - scrollY;
      const nearBottom = remaining < 420;

      setShowTop(scrollY > 520 || nearBottom);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  return (
    <>
      <div className="floating-nav floating-nav-left">
        <button
          aria-label="Quay lại trang trước"
          className="floating-nav-btn"
          onClick={() => window.history.back()}
          type="button"
        >
          ←
        </button>
      </div>

      <div className="floating-nav floating-nav-right">
        <button
          aria-label="Đi tới trang sau"
          className="floating-nav-btn"
          onClick={() => window.history.forward()}
          type="button"
        >
          →
        </button>
      </div>

      <button
        aria-label="Lên đầu trang"
        className={`scroll-top-btn ${showTop ? "is-visible" : ""}`}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        type="button"
      >
        ↑
      </button>
    </>
  );
}
