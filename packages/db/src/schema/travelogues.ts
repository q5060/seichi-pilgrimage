import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import type { PrivacyLevel, TravelogueBlockType } from "@seichi/shared";
import { users } from "./users";

export const travelogues = pgTable("travelogues", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  coverImageUrl: text("cover_image_url"),
  content: jsonb("content").$type<TravelogueBlock[]>().notNull().default([]),
  seriesName: text("series_name"),
  seriesOrder: integer("series_order"),
  isPublished: boolean("is_published").notNull().default(false),
  privacy: text("privacy").$type<PrivacyLevel>().notNull().default("public"),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export interface TravelogueBlock {
  id: string;
  type: TravelogueBlockType;
  data: Record<string, unknown>;
}

export const travelogueCollaborators = pgTable("travelogue_collaborators", {
  travelogueId: uuid("travelogue_id")
    .notNull()
    .references(() => travelogues.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("editor"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
