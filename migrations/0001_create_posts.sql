-- Bài viết. Markdown là nguồn sự thật; HTML không lưu ở đây, để đổi pipeline
-- remark là toàn bộ bài cũ đổi theo.
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  -- Mảng JSON. D1 là SQLite nên không có kiểu mảng.
  tags TEXT NOT NULL DEFAULT '[]',
  body_markdown TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  -- Chỉ đặt khi publish lần đầu; sửa bài sau đó không được đổi giá trị này.
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Truy vấn nóng duy nhất: danh sách bài đã đăng, mới nhất trước.
CREATE INDEX idx_posts_status_published_at ON posts (status, published_at DESC);
