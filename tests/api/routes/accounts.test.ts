import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import { buildApp, type App } from "../../../src/api/app.js";
import type { CreateAccount } from "../../../src/application/use-cases/createAccount/createAccount.js";
import type { GetSystemBalance } from "../../../src/application/use-cases/getSystemBalance/getSystemBalance.js";
import type { CreateTransfer } from "../../../src/application/use-cases/createTransfer/createTransfer.js";
import type { GetAccount } from "../../../src/application/use-cases/getAccount/getAccount.js";
import type { GetTransfer } from "../../../src/application/use-cases/getTransfer/getTransfer.js";
import type { GetAccountEntries } from "../../../src/application/use-cases/getAccountEntries/getAccountEntries.js";
import { v7 as uuidv7 } from "uuid";
import { Account } from "../../../src/domain/account/account.js";
import { Money, type Currency } from "../../../src/domain/money/money.js";

describe("Route accounts", () => {
  let app: App;
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

  it("GET /accounts 200", async () => {
    const accountId = uuidv7();
    const accountName = "account-name";
    const accountCurrency = "USD";
    const accountDate = new Date();
    const account = Account.create(accountId, accountName, accountCurrency, accountDate);
    const balance = Money.fromMinorUnits(1000n, "USD");
    execute.mockResolvedValue({ account, balance });

    const response = await app.inject({
      method: "GET",
      url: `/accounts/${accountId}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      id: accountId,
      name: accountName,
      balance: balance.toMinorUnits(),
      currency: accountCurrency,
    });
  });

  it("GET /accounts 404", async () => {
    const accountId = uuidv7();
    execute.mockResolvedValue(null);

    const response = await app.inject({
      method: "GET",
      url: `/accounts/${accountId}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ message: "Not Found" });
  });

  it("POST /accounts 201", async () => {
    const idAccount = uuidv7();
    const nameAccount = "account-name";
    const currencyAccount = "USD";
    const createdAt = new Date();
    const account = Account.create(idAccount, nameAccount, "USD", createdAt);
    execute.mockResolvedValue(account);

    const response = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: {
        name: nameAccount,
        currency: currencyAccount,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      name: nameAccount,
      currency: currencyAccount,
    });
    expect(execute).toHaveBeenCalledWith({
      name: nameAccount,
      currency: currencyAccount,
    });
  });

  it("POST /accounts 400 invalid currency", async () => {
    const nameAccount = "account-name";
    const currencyAccount = "XYZ" as Currency;

    const response = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: {
        name: nameAccount,
        currency: currencyAccount,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      message: 'body/currency Invalid option: expected one of "USD"|"EUR"|"GBP"|"COP"',
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it("POST /accounts 400 empty name", async () => {
    const nameAccount = "";
    const currencyAccount = "USD";

    const response = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: {
        name: nameAccount,
        currency: currencyAccount,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "body/name Too small: expected string to have >=5 characters",
    });
    expect(execute).not.toHaveBeenCalled();
  });
});
