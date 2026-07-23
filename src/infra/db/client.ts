import postgres from "postgres";
import { config } from "../config/index.js";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const client = postgres(config.DATABASE_URL, {
  connect_timeout: 30,
  max: 10,
});

export const db = drizzle(client, {
  schema,
});

export const closeConnection = async () => {
  await client.end();
};
