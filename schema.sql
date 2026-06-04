-- お気に入り（ユーザーごとの保存店舗）
-- ユーザー本体は Clerk が管理するため、ここには favorites のみを持つ。
CREATE TABLE IF NOT EXISTS favorites (
  clerk_user_id TEXT NOT NULL,   -- Clerk のユーザーID (トークンの sub)
  cafe_id       TEXT NOT NULL,   -- KV(cafe-map) 側の店舗ID
  created_at    TEXT NOT NULL,   -- ISO8601
  PRIMARY KEY (clerk_user_id, cafe_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(clerk_user_id);
