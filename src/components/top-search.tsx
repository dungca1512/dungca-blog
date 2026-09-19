"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PostListItem } from "@/lib/posts";
import { formatDate } from "@/lib/format";
import { createSearchIndexLoader } from "@/lib/search-index-loader";

type SearchHit = {
  post: PostListItem;
  score: number;
};

export function TopSearch() {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<PostListItem[]>([]);
  /* Gọi fetch qua vỏ mũi tên, không truyền thẳng `fetch`: hàm này phải chạy
   * với `this` là window, tách ra khỏi window là "Illegal invocation". */
  const loadRef = useRef<ReturnType<typeof createSearchIndexLoader> | null>(null);

  function loadIndexOnce() {
    loadRef.current ??= createSearchIndexLoader((...args) => fetch(...args));

    /* Lõi lo phần gộp request, nhớ kết quả và cho thử lại khi hỏng — xem
     * src/lib/search-index-loader.ts. Ở đây chỉ còn việc đổ vào state.
     * null nghĩa là lần nạp này hỏng: giữ nguyên posts, không sập trang. */
    loadRef.current().then((data) => {
      if (data) {
        setPosts(data);
      }
    });
  }

  const results = useMemo(() => {
    const keyword = normalizeText(query.trim());
    if (!keyword) {
      return [];
    }

    const hits: SearchHit[] = posts
      .map((post) => {
        const title = normalizeText(post.title);
        const summary = normalizeText(post.summary);
        const tags = normalizeText(post.tags.join(" "));
        const haystack = `${title} ${summary} ${tags}`;

        if (!haystack.includes(keyword)) {
          return null;
        }

        let score = 1;
        if (title.includes(keyword)) {
          score += 3;
        }
        if (summary.includes(keyword)) {
          score += 1;
        }

        return { post, score };
      })
      .filter((item): item is SearchHit => item !== null)
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }

        return Date.parse(right.post.date) - Date.parse(left.post.date);
      });

    return hits.slice(0, 8).map((item) => item.post);
  }, [posts, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) {
        return;
      }

      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const showPanel = open && query.trim().length > 0;

  return (
    <div className="top-search" ref={wrapperRef}>
      <label className="sr-only" htmlFor="search-blog">
        Tìm kiếm bài viết
      </label>
      <span aria-hidden className="top-search-icon">
        ⌕
      </span>
      <input
        autoComplete="off"
        id="search-blog"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          loadIndexOnce();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }

          if (event.key === "Enter" && results.length > 0) {
            event.preventDefault();
            setOpen(false);
            router.push(`/blog/${results[0].slug}`);
          }
        }}
        placeholder="Tìm kiếm ghi chú, ý tưởng và bài ML"
        type="text"
        value={query}
      />

      {showPanel ? (
        <div className="top-search-results">
          {results.length === 0 ? (
            <p className="top-search-empty">Không tìm thấy bài viết phù hợp.</p>
          ) : (
            <div className="top-search-list" role="listbox">
              {results.map((post) => (
                <Link
                  className="top-search-item"
                  href={`/blog/${post.slug}`}
                  key={post.slug}
                  onClick={() => setOpen(false)}
                >
                  <p className="top-search-item-title">{post.title}</p>
                  <p className="top-search-item-snippet">{post.summary}</p>
                  <p className="top-search-item-meta">{formatDate(post.date)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
