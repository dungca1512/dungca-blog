import type { PostListItem } from "@/lib/posts";

/* Lõi nạp chỉ mục tìm kiếm, tách khỏi TopSearch để test được hành vi thật
 * (gộp request, nhớ kết quả, thử lại khi hỏng) mà không cần dựng DOM.
 *
 * Vì sao phải gộp: TopSearch nạp chỉ mục lúc focus. Bản cũ chỉ đánh dấu "đã
 * nạp" SAU KHI fetch thành công, nên mọi lượt focus rơi vào lúc request đầu
 * còn bay đều bắn thêm một request nữa — focus/blur liên tiếp (chạm nhầm
 * trên điện thoại, Tab qua lại) là vài truy vấn D1 cho cùng một dữ liệu.
 *
 * Đánh dấu "đã nạp" ngay khi bắt đầu thì lại hỏng kiểu khác: một lần mạng
 * chập là tìm kiếm chết tới lúc người dùng reload trang. Nên ở đây giữ
 * promise đang bay: lượt gọi sau bám vào chính promise đó, và khi nó hỏng
 * thì xoá đi để lần focus sau được thử lại.
 *
 * Trả null nghĩa là "không có dữ liệu, đừng đụng vào" — gọi được lần nữa. */
export function createSearchIndexLoader(
  fetchImpl: typeof fetch,
): () => Promise<PostListItem[] | null> {
  let daNap: PostListItem[] | null = null;
  let dangBay: Promise<PostListItem[] | null> | null = null;

  return function load() {
    if (daNap) {
      return Promise.resolve(daNap);
    }

    if (dangBay) {
      return dangBay;
    }

    dangBay = fetchImpl("/api/search-index")
      .then(async (res) => {
        if (!res.ok) {
          return null;
        }

        const data: unknown = await res.json();

        /* Chỉ nhận dữ liệu đúng hình dạng mảng. Endpoint có thể trả JSON
         * không phải mảng (trang lỗi 500 dạng JSON, proxy chen vào...);
         * nếu lọt xuống, posts.map trong TopSearch sẽ ném ngay lúc render
         * — mà TopSearch nằm trong root layout, nên một lần fetch hỏng sẽ
         * sập cả site. */
        if (!Array.isArray(data)) {
          return null;
        }

        daNap = data as PostListItem[];
        return daNap;
      })
      .catch(() => null)
      .finally(() => {
        dangBay = null;
      });

    return dangBay;
  };
}
