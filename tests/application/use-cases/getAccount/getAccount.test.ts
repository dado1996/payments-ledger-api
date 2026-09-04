import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransactionRepository } from "../../../../src/application/ports/transactionRepository.js";
import { GetAccount } from "../../../../src/application/use-cases/getAccount/getAccount.js";
import { v7 as uuidv7 } from "uuid";
import { Money } from "../../../../src/domain/money/money.js";
import { Account } from "../../../../src/domain/account/account.js";

describe("GetAccountBalance Usecase", () => {
  let repo: TransactionRepository;
  let getAccountUsecase: GetAccount;

  beforeEach(() => {
    repo = {
      getAccountBalance: vi.fn(),
      saveAccount: vi.fn(),
      saveTransaction: vi.fn(),
      findAccountById: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findTransferById: vi.fn(),
      getEntriesForAccount: vi.fn(),
      getSystemBalance: vi.fn(),
    } satisfies TransactionRepository;
    getAccountUsecase = new GetAccount(repo);
  });

  it("should return the balance and the account", async () => {
    const command = {
      id: uuidv7(),
    };
    const accountName = "account-name";
    const currency = "USD";
    const createdAt = new Date();
    repo.findAccountById = vi
      .fn()
      .mockResolvedValue(Account.create(command.id, accountName, currency, createdAt));
    repo.getAccountBalance = vi.fn().mockResolvedValue(Money.fromMinorUnits(1000n, currency));
    const accountAssert = await getAccountUsecase.execute(command);

    expect(accountAssert).not.toBeNull();
    if (!accountAssert) {
      expect.fail("accountAssert should not be null");
    }
    const { account, balance } = accountAssert;
    const accountSnapshot = account.toSnapshot();
    expect(accountSnapshot.id).toBe(command.id);
    expect(accountSnapshot.name).toBe(accountName);
    expect(accountSnapshot.currency).toBe(currency);
    expect(accountSnapshot.createdAt).toEqual(createdAt);
    expect(balance.toMinorUnits()).toBe("1000");
  });

  it("should return null", async () => {
    const command = {
      id: uuidv7(),
    };
    const accountAssert = await getAccountUsecase.execute(command);
    expect(accountAssert).toBeNull();
  });
});
