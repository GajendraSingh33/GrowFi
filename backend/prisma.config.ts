import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    // DATABASE_URL is the single source of truth for all environments.
    // Local dev: postgresql://postgres:1234@localhost:5432/growfi
    // Production (Render): use the internal PostgreSQL URL from Render's dashboard.
    url: env("DATABASE_URL"),
  },
});
