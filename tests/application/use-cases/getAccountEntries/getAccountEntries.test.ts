import { beforeEach, describe, expect, it } from "vitest";
import type { TransactionRepository } from "../../../../src/application/ports/transactionRepository.js";
import { GetAccountEntries } from "../../../../src/application/use-cases/getAccountEntries/getAccountEntries.js";
import { vi } from "vitest";
import { v7 as uuidv7 } from "uuid";
import { Entry } from "../../../../src/domain/transaction/entry.js";
import { Account } from "../../../../src/domain/account/account.js";
import { AccountNotFoundError } from "../../../../src/domain/errors.js";

describe("GetAccountEntries usecase", () => {
  let repo: TransactionRepository;
  let getAccountentriesUsecase: GetAccountEntries;
  beforeEach(() => {
    repo = {
      getEntriesForAccount: vi.fn(),
      getAccountBalance: vi.fn(),
      getSystemBalance: vi.fn(),
      findAccountById: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findTransferById: vi.fn(),
      saveAccount: vi.fn(),
      saveTransaction: vi.fn(),
    } satisfies TransactionRepository;
    getAccountentriesUsecase = new GetAccountEntries(repo);
  });

  it("should return the entries with their accountIds and amounts", async () => {
    const command = {
      id: uuidv7(),
    };

    repo.findAccountById = vi
      .fn()
      .mockResolvedValue(Account.create(command.id, "account-name", "USD", new Date()));

    repo.getEntriesForAccount = vi
      .fn()
      .mockResolvedValue([
        Entry.create(command.id, 1000n),
        Entry.create(command.id, 2000n),
        Entry.create(command.id, -1000n),
        Entry.create(command.id, -2000n),
      ]);

    const entriesAssert = await getAccountentriesUsecase.execute(command);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findAccountById).toHaveBeenCalledWith(command.id);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.getEntriesForAccount).toHaveBeenCalled();
    expect(entriesAssert).toHaveLength(4);
  });

  it("should return empty", async () => {
    const command = {
      id: uuidv7(),
    };

    repo.findAccountById = vi
      .fn()
      .mockResolvedValue(Account.create(command.id, "account-name", "USD", new Date()));

    repo.getEntriesForAccount = vi.fn().mockResolvedValue([]);

    const entriesAssert = await getAccountentriesUsecase.execute(command);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.getEntriesForAccount).toHaveBeenCalled();
    expect(entriesAssert).toHaveLength(0);
  });

  it("should throw because of no account", async () => {
    const command = {
      id: uuidv7(),
    };
    repo.findAccountById = vi.fn().mockResolvedValue(null);

    try {
      await getAccountentriesUsecase.execute(command);
      expect.fail("Should have thrown because of missing account");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AccountNotFoundError);
      if (error instanceof AccountNotFoundError) {
        expect(error.message).toMatch("");
        expect(error.id).toBe(command.id);
      } else {
        expect.fail("Should have been instance of AccountNotFound");
      }
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findAccountById).toHaveBeenCalledWith(command.id);
  });
});
