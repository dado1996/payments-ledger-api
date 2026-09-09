import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp, type App } from "../../../src/api/app.js";
import { GetSystemBalance } from "../../../src/application/use-cases/getSystemBalance/getSystemBalance.js";
import type { GetAccount } from "../../../src/application/use-cases/getAccount/getAccount.js";
import type { GetAccountEntries } from "../../../src/application/use-cases/getAccountEntries/getAccountEntries.js";
import type { GetTransfer } from "../../../src/application/use-cases/getTransfer/getTransfer.js";
import type { CreateAccount } from "../../../src/application/use-cases/createAccount/createAccount.js";
import type { CreateTransfer } from "../../../src/application/use-cases/createTransfer/createTransfer.js";

describe("System routes", () => {
  let app: App;
  let execute: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    execute = vi.fn();
    app = buildApp({
      logger: false,
      getSystemBalance: { execute } as unknown as GetSystemBalance,
      getAccount: { execute } as unknown as GetAccount,
      getAccountEntries: { execute } as unknown as GetAccountEntries,
      getTransfer: { execute } as unknown as GetTransfer,
      createAccount: { execute } as unknown as CreateAccount,
      createTransfer: { execute } as unknown as CreateTransfer,
    });
  });

  it("GET /reconciliation 200 isBalanced", async () => {
    execute.mockResolvedValue({
      balances: [
        {
          currency: "USD",
          balance: "0",
        },
        {
          currency: "COP",
          balance: "0",
        },
        {
          currency: "EUR",
          balance: "0",
        },
        {
          currency: "GBP",
          balance: "0",
        },
      ],
      isBalanced: true,
    });
    const response = await app.inject({
      method: "GET",
      url: "/reconciliation",
    });
    expect(response.statusCode).toBe(200);
    expect(execute).toHaveBeenCalled();
    expect(response.json()).toHaveProperty("balances");
    expect(response.json()).toHaveProperty("isBalanced", true);
  });

  it("GET /reconciliation 200 isNotBalanced", async () => {
    execute.mockResolvedValue({
      balances: [
        {
          currency: "USD",
          balance: "1000",
        },
        {
          currency: "COP",
          balance: "0",
        },
        {
          currency: "EUR",
          balance: "-2000",
        },
        {
          currency: "GBP",
          balance: "0",
        },
      ],
      isBalanced: false,
    });
    const response = await app.inject({
      method: "GET",
      url: "/reconciliation",
    });
    expect(response.statusCode).toBe(200);
    expect(execute).toHaveBeenCalled();
    expect(response.json()).toHaveProperty("isBalanced", false);
    expect(response.json()).toHaveProperty("balances");
  });
});
