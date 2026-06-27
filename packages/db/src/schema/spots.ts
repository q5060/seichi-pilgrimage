import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  real,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import type {
  AccessType,
  SpotStatus,
  ModerationStatus,
  SpotAnimeScene,
} from "@seichi/shared";
import { users } from "./users";
import { anime } from "./anime";

export const spots = pgTable("spots", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameZh: text("name_zh").notNull(),
  nameJa: text("name_ja"),
  slug: text("slug").notNull().unique(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  fuzzyLatitude: real("fuzzy_latitude"),
  fuzzyLongitude: real("fuzzy_longitude"),
  isSensitive: boolean("is_sensitive").notNull().default(false),
  prefecture: text("prefecture").notNull(),
  address: text("address"),
  googleMapsUrl: text("google_maps_url"),
  osmUrl: text("osm_url"),
  accessType: text("access_type").$type<AccessType>().notNull().default("uncertain"),
  status: text("status").$type<SpotStatus>().notNull().default("open"),
  lastConfirmedAt: timestamp("last_confirmed_at"),
  transportNotes: text("transport_notes"),
  nearestStation: text("nearest_station"),
  walkMinutes: integer("walk_minutes"),
  suggestedStayMinutes: integer("suggested_stay_minutes"),
  businessHours: text("business_hours"),
  photoTips: text("photo_tips"),
  bestSeason: text("best_season"),
  bestTimeOfDay: text("best_time_of_day"),
  focalLengthSuggestion: text("focal_length_suggestion"),
  alignmentDifficulty: integer("alignment_difficulty"),
  etiquetteNotes: text("etiquette_notes"),
  moderationStatus: text("moderation_status")
    .$type<ModerationStatus>()
    .notNull()
    .default("approved"),
  createdById: uuid("created_by_id").references(() => users.id),
  visitCount: integer("visit_count").notNull().default(0),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const spotAnimeLinks = pgTable("spot_anime_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotId: uuid("spot_id")
    .notNull()
    .references(() => spots.id, { onDelete: "cascade" }),
  anilistId: integer("anilist_id")
    .notNull()
    .references(() => anime.anilistId, { onDelete: "cascade" }),
  episode: text("episode"),
  scene: jsonb("scene").$type<SpotAnimeScene>(),
  sortOrder: integer("sort_order").notNull().default(0),
  moderationStatus: text("moderation_status")
    .$type<ModerationStatus>()
    .notNull()
    .default("approved"),
  proposedById: uuid("proposed_by_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const spotVersions = pgTable("spot_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotId: uuid("spot_id")
    .notNull()
    .references(() => spots.id, { onDelete: "cascade" }),
  editorId: uuid("editor_id")
    .notNull()
    .references(() => users.id),
  snapshot: jsonb("snapshot").notNull(),
  changeSummary: text("change_summary"),
  moderationStatus: text("moderation_status")
    .$type<ModerationStatus>()
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const locationReports = pgTable("location_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  spotId: uuid("spot_id")
    .notNull()
    .references(() => spots.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportType: text("report_type").notNull(),
  notes: text("notes"),
  visitedAt: timestamp("visited_at"),
  moderationStatus: text("moderation_status")
    .$type<ModerationStatus>()
    .notNull()
    .default("approved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const spotHelpfulVotes = pgTable("spot_helpful_votes", {
  spotId: uuid("spot_id")
    .notNull()
    .references(() => spots.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
