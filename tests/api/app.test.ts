import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { buildApp } from "../../src/api/app.js";
import type { FastifyInstance } from "fastify";

describe("API", () => {
  let app: FastifyInstance;
  beforeEach(() => {
    app = buildApp({
      logger: false,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("GET /health returns 200", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
    });

    await app.close();
  });

  it("GET /nope returns 400", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/nope",
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Route GET:/nope not found",
      error: "Not Found",
      statusCode: 404,
    });
  });
});
