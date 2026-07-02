import { defineConfig } from "drizzle-kit";

process.loadEnvFile();

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infra/db/schema.ts",
  out: "./migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
