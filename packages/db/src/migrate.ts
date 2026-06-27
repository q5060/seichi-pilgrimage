import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "./schema";

async function main() {
  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://seichi:seichi@localhost:5432/seichi";

  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient, { schema });

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete.");

  // Enable PostGIS extension
  await migrationClient`CREATE EXTENSION IF NOT EXISTS postgis`;
  console.log("PostGIS extension enabled.");

  await migrationClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
