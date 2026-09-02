import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp, type App } from "../../../src/api/app.js";
import type { CreateTransfer } from "../../../src/application/use-cases/createTransfer/createTransfer.js";
import { Entry } from "../../../src/domain/transaction/entry.js";
import { Transaction } from "../../../src/domain/transaction/transaction.js";
import { v7 as uuidv7 } from "uuid";
import {
  AccountNotFoundError,
  CurrencyMismatchError,
  IdempotencyConflictError,
} from "../../../src/domain/errors.js";
import type { Currency } from "../../../src/domain/money/money.js";
import type { GetAccountBalance } from "../../../src/application/use-cases/getAccountBalance/getAccountBalance.js";
import type { GetAccountEntries } from "../../../src/application/use-cases/getAccountEntries/getAccountEntries.js";
import type { GetTransfer } from "../../../src/application/use-cases/getTransfer/getTransfer.js";
import type { GetSystemBalance } from "../../../src/application/use-cases/getSystemBalance/getSystemBalance.js";
import type { CreateAccount } from "../../../src/application/use-cases/createAccount/createAccount.js";

describe("Route transfers", () => {
  let app: App;
  let execute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    execute = vi.fn();
    app = buildApp({
      logger: false,
      createTransfer: { execute } as unknown as CreateTransfer,
      getAccountBalance: { execute } as unknown as GetAccountBalance,
      getAccountEntries: { execute } as unknown as GetAccountEntries,
      getTransfer: { execute } as unknown as GetTransfer,
      getSystemBalance: { execute } as unknown as GetSystemBalance,
      createAccount: { execute } as unknown as CreateAccount,
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("creates a transfer and returns its snapshot", async () => {
    const sourceAccountId = uuidv7();
    const destinationAccountId = uuidv7();
    const idempotencyKey = `key-${uuidv7()}`;
    const createdAt = new Date("2026-01-01T12:00:00.000Z");
    const transaction = Transaction.create(uuidv7(), idempotencyKey, createdAt, "USD", [
      Entry.create(sourceAccountId, -1000n),
      Entry.create(destinationAccountId, 1000n),
    ]);
    execute.mockResolvedValue(transaction);

    const response = await app.inject({
      method: "POST",
      url: "/transfers",
      headers: { "Idempotency-Key": idempotencyKey },
      payload: {
        sourceAccountId,
        destinationAccountId,
        currency: "USD",
        amount: "1000",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: transaction.toSnapshot().id,
      idempotencyKey,
      currency: "USD",
      createdAt: createdAt.toISOString(),
      entries: [{ amount: "-1000" }, { amount: "1000" }],
    });
    expect(execute).toHaveBeenCalledWith({
      sourceAccountId,
      destinationAccountId,
      currency: "USD",
      amount: 1000n,
      idempotencyKey,
    });
  });

  it("rejects a request with an invalid idempotency key", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/transfers",
      headers: { "Idempotency-Key": "key" },
      payload: {
        sourceAccountId: uuidv7(),
        destinationAccountId: uuidv7(),
        currency: "USD",
        amount: "1000",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).contain({
      code: "VALIDATION_ERROR",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects a request with an invalid amount", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/transfers",
      headers: { "Idempotency-Key": `key-${uuidv7()}` },
      payload: {
        sourceAccountId: uuidv7(),
        destinationAccountId: uuidv7(),
        currency: "USD",
        amount: "0",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).contain({
      code: "VALIDATION_ERROR",
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("rejects due to the account not found", async () => {
    const id = uuidv7();
    execute.mockRejectedValue(new AccountNotFoundError("Account not found", id));

    const response = await app.inject({
      method: "POST",
      url: "/transfers",
      headers: { "Idempotency-Key": `key-${uuidv7()}` },
      payload: {
        sourceAccountId: uuidv7(),
        destinationAccountId: uuidv7(),
        currency: "USD",
        amount: "1000",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      code: "ACCOUNT_NOT_FOUND",
      message: "Account not found",
    });
  });

  it("rejects due to a currency mismatch", async () => {
    const currency: Currency = "EUR";
    execute.mockRejectedValue(new CurrencyMismatchError("Invalid currency", currency));

    const response = await app.inject({
      method: "POST",
      url: "/transfers",
      headers: { "Idempotency-Key": `key-${uuidv7()}` },
      payload: {
        sourceAccountId: uuidv7(),
        destinationAccountId: uuidv7(),
        currency: "USD",
        amount: "1000",
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      code: "CURRENCY_MISMATCH",
      message: "Invalid currency",
    });
  });

  it("rejects due to idempotency conflict", async () => {
    const idempotencyKey = `key-${uuidv7()}`;
    execute.mockRejectedValue(new IdempotencyConflictError("Idempotency conflict", idempotencyKey));

    const response = await app.inject({
      method: "POST",
      url: "/transfers",
      headers: { "Idempotency-Key": `key-${uuidv7()}` },
      payload: {
        sourceAccountId: uuidv7(),
        destinationAccountId: uuidv7(),
        currency: "USD",
        amount: "1000",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      code: "DUPLICATE_TRANSFER",
      message: "Idempotency conflict",
    });
  });

  it("GET /transfers/:id 200", async () => {
    const id = uuidv7();
    const idempotencyKey = `key-${uuidv7()}`;
    const createdAt = new Date();
    const currency = "USD";
    const entries = [Entry.create(uuidv7(), 1000n), Entry.create(uuidv7(), -1000n)];
    execute.mockResolvedValue(Transaction.create(id, idempotencyKey, createdAt, currency, entries));

    const response = await app.inject({
      method: "GET",
      url: `/transfers/${id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id,
      idempotencyKey,
      currency,
      entries: entries.map((entry) => ({
        accountId: entry.toSnapshot().accountId,
        amount: entry.toSnapshot().amount.toString(),
      })),
    });
  });

  it("GET /transfers/:id 404", async () => {
    const id = uuidv7();
    execute.mockResolvedValue(null);

    const response = await app.inject({
      method: "GET",
      url: `/transfers/${id}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      message: "Not Found",
    });
  });
});
