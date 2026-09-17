export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function buildArticleHtmlAndToc(contentHtml: string): {
  htmlWithIds: string;
  toc: TocItem[];
} {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();

  const htmlWithIds = contentHtml.replace(
    /<h([2-3])>([\s\S]*?)<\/h\1>/g,
    (headingSource, levelValue, titleHtml) => {
      const level = Number(levelValue) as 2 | 3;
      const text = stripHtml(titleHtml).trim();
      if (!text) {
        return headingSource;
      }

      const baseId = toSlug(text) || `muc-${toc.length + 1}`;
      const count = (used.get(baseId) ?? 0) + 1;
      used.set(baseId, count);
      const id = count === 1 ? baseId : `${baseId}-${count}`;

      toc.push({ id, text, level });

      return `<h${level} id="${id}" class="article-heading">${titleHtml}</h${level}>`;
    },
  );

  return {
    htmlWithIds,
    toc,
  };
}

export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");
}

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    /* đ là ký tự đơn trong Unicode, không phải d + dấu, nên NFD không tách
     * nó ra và bước lọc ký tự lạ bên dưới xoá thẳng. Phải thay trước normalize
     * để "Đăng bài" không thành "ang-bai". */
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    /* Sau khi xoá ký tự lạ, "— Mở đầu —" còn "- mo dau -". Không để slug
     * bắt đầu/kết thúc bằng gạch nối vì đó là URL trông như lỗi. */
    .replace(/^-|-$/g, "");
}
