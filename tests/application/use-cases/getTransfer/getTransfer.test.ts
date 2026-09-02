import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetTransfer } from "../../../../src/application/use-cases/getTransfer/getTransfer.js";
import type { TransactionRepository } from "../../../../src/application/ports/transactionRepository.js";
import { v7 as uuidv7 } from "uuid";
import { Transaction } from "../../../../src/domain/transaction/transaction.js";
import { Entry } from "../../../../src/domain/transaction/entry.js";

describe("GetTransfer usecase", () => {
  let getTransferUsecase: GetTransfer;
  let repo: TransactionRepository;

  beforeEach(() => {
    repo = {
      findTransferById: vi.fn(),
      getAccountBalance: vi.fn(),
      getSystemBalance: vi.fn(),
      getEntriesForAccount: vi.fn(),
      findAccountById: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      saveAccount: vi.fn(),
      saveTransaction: vi.fn(),
    } satisfies TransactionRepository;
    getTransferUsecase = new GetTransfer(repo);
  });

  it("should return the transaction", async () => {
    const command = {
      id: uuidv7(),
    };
    const idempotencyKey = `key-${uuidv7()}`;
    const createdAt = new Date();
    const currency = "USD";
    const entries = [Entry.create(uuidv7(), 1000n), Entry.create(uuidv7(), -1000n)];
    repo.findTransferById = vi
      .fn()
      .mockResolvedValue(
        Transaction.create(command.id, idempotencyKey, createdAt, currency, entries),
      );
    const transactionAssert = await getTransferUsecase.execute(command);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findTransferById).toHaveBeenCalled();
    expect(transactionAssert).not.toBeNull();
    if (transactionAssert instanceof Transaction) {
      const snapshot = transactionAssert.toSnapshot();
      expect(snapshot.id).toBe(command.id);
      expect(snapshot.idempotencyKey).toBe(idempotencyKey);
    }
  });

  it("should return null", async () => {
    const command = {
      id: uuidv7(),
    };
    repo.findTransferById = vi.fn().mockResolvedValue(null);
    const transactionAssert = await getTransferUsecase.execute(command);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findTransferById).toHaveBeenCalled();
    expect(transactionAssert).toBeNull();
  });
});
