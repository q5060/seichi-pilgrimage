import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  real,
  uuid,
  unique,
} from "drizzle-orm/pg-core";
import type { AnimeTitles, PilgrimageStatus } from "@seichi/shared";

export const anime = pgTable("anime", {
  anilistId: integer("anilist_id").primaryKey(),
  titles: jsonb("titles").$type<AnimeTitles>().notNull(),
  coverImage: text("cover_image"),
  bannerImage: text("banner_image"),
  format: text("format"),
  status: text("status"),
  episodes: integer("episodes"),
  season: text("season"),
  seasonYear: integer("season_year"),
  genres: jsonb("genres").$type<string[]>().default([]),
  description: text("description"),
  averageScore: integer("average_score"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
});

export const animePilgrimageMeta = pgTable("anime_pilgrimage_meta", {
  anilistId: integer("anilist_id")
    .primaryKey()
    .references(() => anime.anilistId, { onDelete: "cascade" }),
  popularity: integer("popularity").notNull().default(0),
  suggestedDays: integer("suggested_days"),
  etiquetteNotes: text("etiquette_notes"),
  customTitle: text("custom_title"),
  spotCount: integer("spot_count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userAnimeStatus = pgTable("user_anime_status", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id").notNull(),
  anilistId: integer("anilist_id")
    .notNull()
    .references(() => anime.anilistId, { onDelete: "cascade" }),
  status: text("status").$type<PilgrimageStatus>().notNull().default("want"),
  score: real("score"),
  review: text("review"),
  tags: jsonb("tags").$type<string[]>().default([]),
  visitedSpotCount: integer("visited_spot_count").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique().on(table.userId, table.anilistId),
]);
