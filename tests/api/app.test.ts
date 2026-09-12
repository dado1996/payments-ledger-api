import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { buildApp } from "../../src/api/app.js";
import type { FastifyInstance } from "fastify";
import type { CreateAccount } from "../../src/application/use-cases/createAccount/createAccount.js";
import type { GetSystemBalance } from "../../src/application/use-cases/getSystemBalance/getSystemBalance.js";
import type { CreateTransfer } from "../../src/application/use-cases/createTransfer/createTransfer.js";
import type { GetAccount } from "../../src/application/use-cases/getAccount/getAccount.js";
import type { GetTransfer } from "../../src/application/use-cases/getTransfer/getTransfer.js";
import type { GetAccountEntries } from "../../src/application/use-cases/getAccountEntries/getAccountEntries.js";

describe("API", () => {
  let app: FastifyInstance;
  let execute: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    execute = vi.fn();
    app = buildApp({
      logger: false,
      createAccount: { execute } as unknown as CreateAccount,
      getSystemBalance: { execute } as unknown as GetSystemBalance,
      createTransfer: { execute } as unknown as CreateTransfer,
      getAccount: { execute } as unknown as GetAccount,
      getTransfer: { execute } as unknown as GetTransfer,
      getAccountEntries: { execute } as unknown as GetAccountEntries,
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
