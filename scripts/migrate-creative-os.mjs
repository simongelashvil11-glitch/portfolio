// Applies CreativeOS migrations (drizzle-creative-os/) over Neon's HTTP driver.
// drizzle-kit's own `migrate` needs a WebSocket driver to reach Neon, which
// this project does not ship; drizzle-orm's HTTP migrator does the same job
// with the driver the site already uses, recording history in
// creative_os.__migrations so each migration runs once.
//
//   node --env-file=.env.local scripts/migrate-creative-os.mjs
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");

const db = drizzle(neon(process.env.DATABASE_URL));
await migrate(db, {
  migrationsFolder: "./drizzle-creative-os",
  migrationsTable: "__migrations",
  migrationsSchema: "creative_os",
});
console.log("CreativeOS migrations applied.");
