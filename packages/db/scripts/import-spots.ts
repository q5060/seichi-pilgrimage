#!/usr/bin/env tsx
/**
 * Import spots from JSON or CSV into the database.
 *
 * JSON format: array of {
 *   nameZh, nameJa?, slug?, latitude, longitude, prefecture, address?,
 *   anilistIds?: number[], episode?, scene?
 * }
 *
 * Usage:
 *   npm run db:import-spots -- ./data/spots.json
 *   npm run db:import-spots -- ./data/spots.csv
 */
import fs from "fs";
import path from "path";
import { db, spots, spotAnimeLinks } from "../src";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `spot-${Date.now()}`;
}

type SpotInput = {
  nameZh: string;
  nameJa?: string;
  slug?: string;
  latitude: number;
  longitude: number;
  prefecture: string;
  address?: string;
  nearestStation?: string;
  walkMinutes?: number;
  anilistIds?: number[];
  episode?: string;
  scene?: string;
};

function parseCsv(content: string): SpotInput[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: SpotInput[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });

    rows.push({
      nameZh: row.nameZh,
      nameJa: row.nameJa || undefined,
      slug: row.slug || undefined,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      prefecture: row.prefecture,
      address: row.address || undefined,
      nearestStation: row.nearestStation || undefined,
      walkMinutes: row.walkMinutes ? Number(row.walkMinutes) : undefined,
      anilistIds: row.anilistIds
        ? row.anilistIds.split(/[;|]/).map((n) => Number(n.trim())).filter(Boolean)
        : undefined,
      episode: row.episode || undefined,
      scene: row.scene || undefined,
    });
  }

  return rows;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run db:import-spots -- <path-to-json-or-csv>");
    process.exit(1);
  }

  const abs = path.resolve(file);
  const raw = fs.readFileSync(abs, "utf-8");
  const ext = path.extname(abs).toLowerCase();

  let items: SpotInput[];
  if (ext === ".csv") {
    items = parseCsv(raw);
  } else {
    items = JSON.parse(raw) as SpotInput[];
  }

  let imported = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.nameZh || !item.prefecture || Number.isNaN(item.latitude) || Number.isNaN(item.longitude)) {
      skipped++;
      continue;
    }

    const slug = item.slug ?? slugify(item.nameZh);

    const [spot] = await db
      .insert(spots)
      .values({
        nameZh: item.nameZh,
        nameJa: item.nameJa,
        slug,
        latitude: item.latitude,
        longitude: item.longitude,
        prefecture: item.prefecture,
        address: item.address,
        nearestStation: item.nearestStation,
        walkMinutes: item.walkMinutes,
        moderationStatus: "approved",
        lastConfirmedAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    if (!spot) {
      skipped++;
      continue;
    }

    imported++;

    for (const anilistId of item.anilistIds ?? []) {
      await db
        .insert(spotAnimeLinks)
        .values({
          spotId: spot.id,
          anilistId,
          episode: item.episode,
          scene: item.scene ? { description: item.scene } : undefined,
          moderationStatus: "approved",
        })
        .onConflictDoNothing();
    }
  }

  console.log(`Import complete: ${imported} spots imported, ${skipped} skipped.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
