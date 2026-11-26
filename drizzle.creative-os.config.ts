import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

/*
 * CreativeOS has its own migrations, kept apart from the portfolio's:
 * everything is in the `creative_os` Postgres schema, the history is in
 * `creative_os.__migrations`, and `schemaFilter` keeps drizzle-kit from
 * looking at (or proposing changes to) any other schema.
 *
 *   npx drizzle-kit generate --config drizzle.creative-os.config.ts
 *   npx drizzle-kit migrate  --config drizzle.creative-os.config.ts
 */
export default defineConfig({
  schema: "./src/db/creative-os.ts",
  out: "./drizzle-creative-os",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  schemaFilter: ["creative_os"],
  migrations: { table: "__migrations", schema: "creative_os" },
  strict: true,
  verbose: true,
});
