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
import type { PrivacyLevel, PhotoTag } from "@seichi/shared";
import { users } from "./users";
import { spots } from "./spots";

export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  spotId: uuid("spot_id")
    .notNull()
    .references(() => spots.id, { onDelete: "cascade" }),
  visitedAt: timestamp("visited_at").notNull(),
  rating: real("rating"),
  notes: text("notes"),
  companions: text("companions"),
  privacy: text("privacy").$type<PrivacyLevel>().notNull().default("public"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  spotId: uuid("spot_id").references(() => spots.id, { onDelete: "set null" }),
  visitId: uuid("visit_id").references(() => visits.id, { onDelete: "set null" }),
  travelogueId: uuid("travelogue_id"),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  tag: text("tag").$type<PhotoTag>().notNull().default("scenery"),
  comparisonScreenshotUrl: text("comparison_screenshot_url"),
  isComparison: boolean("is_comparison").notNull().default(false),
  altText: text("alt_text"),
  width: integer("width"),
  height: integer("height"),
  privacy: text("privacy").$type<PrivacyLevel>().notNull().default("public"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
