import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export async function markdownToHtml(markdown: string): Promise<string> {
  /* Ghim sanitize: true tường minh, đừng phụ thuộc mặc định của remark-html.
   * Thân bài sắp đến từ D1 qua trình soạn thảo ở Kế hoạch B — đây là ranh
   * giới tin cậy, HTML thô/script chèn vào không được lọt ra trang. */
  const processed = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: true })
    .process(markdown);

  return processed.toString();
}
