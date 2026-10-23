CREATE SEQUENCE listing_code_seq AS integer START WITH 1 INCREMENT BY 1;
--> statement-breakpoint
CREATE TABLE listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE
                  DEFAULT ('SWP-' || to_char(nextval('listing_code_seq'), 'FM0000')),
  title           varchar(100) NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  description     text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),
  price_idr       integer NOT NULL CHECK (price_idr > 0 AND price_idr <= 1000000000),
  is_sold         boolean NOT NULL DEFAULT false,
  sold_at         timestamptz,
  video_provider  text NOT NULL CHECK (video_provider IN ('youtube','tiktok','google_drive')),
  video_url       text NOT NULL CHECK (video_url LIKE 'https://%' AND char_length(video_url) <= 2048),
  thumbnail_path  text NOT NULL CHECK (thumbnail_path LIKE '/media/%'),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sold_at_matches_status CHECK (
    (is_sold AND sold_at IS NOT NULL) OR (NOT is_sold AND sold_at IS NULL)
  )
);
--> statement-breakpoint
CREATE INDEX listings_created_idx ON listings (created_at DESC, id DESC);
--> statement-breakpoint
CREATE INDEX listings_status_created_idx ON listings (is_sold, created_at DESC, id DESC);
--> statement-breakpoint
CREATE INDEX listings_price_idx ON listings (price_idr ASC, id ASC);
--> statement-breakpoint
CREATE TABLE admin_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   char(64) NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  ip           inet,
  user_agent   text
);
--> statement-breakpoint
CREATE INDEX admin_sessions_expires_idx ON admin_sessions (expires_at);
