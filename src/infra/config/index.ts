if (process.env.NODE_ENV !== "production") {
  process.loadEnvFile();
}

const url = process.env.DATABASE_URL;
const port = Number(process.env.PORT) || 8000;
const host = process.env.HOST ?? "0.0.0.0";
if (!url) {
  throw new Error("DATABASE_URL required!");
}

export const config = Object.freeze({
  DATABASE_URL: url,
  PORT: port,
  HOST: host,
  DATABASE_SSL: false,
});
