import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  inet,
  integer,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Standalone sequence used by the listing code default. Keeping generation in
 * PostgreSQL makes concurrent inserts race-safe; gaps are acceptable and codes
 * are never reused.
 */
export const listingCodeSequence = pgSequence("listing_code_seq", {
  startWith: 1,
  increment: 1,
});

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code")
      .notNull()
      .unique()
      .default(sql`('SWP-' || to_char(nextval('listing_code_seq'), 'FM0000'))`),
    title: varchar("title", { length: 100 }).notNull(),
    description: text("description").notNull(),
    priceIdr: integer("price_idr").notNull(),
    isSold: boolean("is_sold").notNull().default(false),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    videoProvider: text("video_provider", {
      enum: ["youtube", "tiktok", "google_drive"],
    }).notNull(),
    videoUrl: text("video_url").notNull(),
    thumbnailPath: text("thumbnail_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "listings_title_length_check",
      sql`char_length(${table.title}) between 3 and 100`,
    ),
    check(
      "listings_description_length_check",
      sql`char_length(${table.description}) between 10 and 5000`,
    ),
    check(
      "listings_price_idr_check",
      sql`${table.priceIdr} > 0 and ${table.priceIdr} <= 1000000000`,
    ),
    check(
      "listings_video_provider_check",
      sql`${table.videoProvider} in ('youtube', 'tiktok', 'google_drive')`,
    ),
    check(
      "listings_video_url_check",
      sql`${table.videoUrl} like 'https://%' and char_length(${table.videoUrl}) <= 2048`,
    ),
    check(
      "listings_thumbnail_path_check",
      sql`${table.thumbnailPath} like '/media/%'`,
    ),
    check(
      "sold_at_matches_status",
      sql`(${table.isSold} and ${table.soldAt} is not null) or (not ${table.isSold} and ${table.soldAt} is null)`,
    ),
    index("listings_created_idx").on(
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("listings_status_created_idx").on(
      table.isSold,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    index("listings_price_idx").on(table.priceIdr.asc(), table.id.asc()),
  ],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: char("token_hash", { length: 64 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ip: inet("ip"),
    userAgent: text("user_agent"),
  },
  (table) => [index("admin_sessions_expires_idx").on(table.expiresAt)],
);

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminSession = typeof adminSessions.$inferInsert;
