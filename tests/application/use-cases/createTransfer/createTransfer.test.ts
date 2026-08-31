import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTransfer } from "../../../../src/application/use-cases/createTransfer/createTransfer.js";
import type { TransactionRepository } from "../../../../src/application/ports/transactionRepository.js";
import { Transaction } from "../../../../src/domain/transaction/transaction.js";
import { v7 as uuidv7 } from "uuid";
import { Account } from "../../../../src/domain/account/account.js";
import {
  AccountNotFoundError,
  CurrencyMismatchError,
  IdempotencyConflictError,
} from "../../../../src/domain/errors.js";
import { Entry } from "../../../../src/domain/transaction/entry.js";
import { createTransferDTO } from "../../../helpers/createTransferDTO.js";

describe("Application create transfer", () => {
  let createTransferUsecase: CreateTransfer;
  let repo: TransactionRepository;

  beforeEach(() => {
    repo = {
      saveTransaction: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findTransferById: vi.fn(),
      findAccountById: vi.fn(),
      getAccountBalance: vi.fn(),
      getEntriesForAccount: vi.fn(),
      getSystemBalance: vi.fn(),
      saveAccount: vi.fn(),
    } satisfies TransactionRepository;
    createTransferUsecase = new CreateTransfer(repo);
  });

  it("should execute the create transfer usecase successfully", async () => {
    repo.findByIdempotencyKey = vi.fn().mockResolvedValue(null);
    repo.findAccountById = vi
      .fn()
      .mockResolvedValue(Account.create(uuidv7(), "account-name", "USD", new Date()));

    const command = createTransferDTO();
    const transactionResult = await createTransferUsecase.execute(command);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findByIdempotencyKey).toHaveBeenCalledWith(command.idempotencyKey);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findAccountById).toHaveBeenCalledWith(command.sourceAccountId);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.findAccountById).toHaveBeenCalledWith(command.destinationAccountId);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.saveTransaction).toHaveBeenCalledOnce();
    expect(transactionResult).toBeInstanceOf(Transaction);
    expect(transactionResult.getCurrency()).toBe(command.currency);
    expect(transactionResult.toSnapshot().idempotencyKey).toBe(command.idempotencyKey);
  });

  it("should return existent transaction", async () => {
    const entries = [Entry.create(uuidv7(), 1000n), Entry.create(uuidv7(), -1000n)];
    const transaction = Transaction.create(uuidv7(), `key-${uuidv7()}`, new Date(), "USD", entries);

    repo.findByIdempotencyKey = vi.fn().mockResolvedValue(transaction);

    const command = createTransferDTO();
    const result = await createTransferUsecase.execute(command);
    expect(result).toBe(transaction);
  });

  it("should fail due to account not found", async () => {
    repo.findByIdempotencyKey = vi.fn().mockResolvedValue(null);
    repo.findAccountById = vi.fn().mockResolvedValue(null);

    const command = createTransferDTO();
    try {
      await createTransferUsecase.execute(command);
      expect.fail("Should have thrown invalid account error");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(AccountNotFoundError);
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.saveTransaction).not.toHaveBeenCalled();
  });

  it("should fail because of a currency mismatch", async () => {
    repo.findAccountById = vi
      .fn()
      .mockResolvedValue(Account.create(uuidv7(), "account-name", "EUR", new Date()));

    const command = createTransferDTO();
    try {
      await createTransferUsecase.execute(command);
      expect.fail("Should have thrown CurrencyMismatchError");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(CurrencyMismatchError);
    }
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.saveTransaction).not.toHaveBeenCalled();
  });

  it("should fail the first saveTransaction and return the existing idempotency key", async () => {
    const idempotencyKey = `key-${uuidv7()}`;
    const entries = [Entry.create(uuidv7(), 1000n), Entry.create(uuidv7(), -1000n)];
    const transaction = Transaction.create(uuidv7(), idempotencyKey, new Date(), "USD", entries);
    repo.findByIdempotencyKey = vi.fn().mockResolvedValueOnce(null).mockResolvedValue(transaction);
    repo.findAccountById = vi
      .fn()
      .mockResolvedValue(Account.create(uuidv7(), "account-name", "USD", new Date()));
    repo.saveTransaction = vi
      .fn()
      .mockRejectedValue(new IdempotencyConflictError("Key exists", idempotencyKey));

    const command = createTransferDTO();
    const result = await createTransferUsecase.execute(command);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.saveTransaction).toHaveBeenCalledOnce();
    expect(result).toEqual(transaction);
  });

  it("should fail the saveTransaction", async () => {
    const idempotencyKey = `key-${uuidv7()}`;
    repo.findByIdempotencyKey = vi.fn().mockResolvedValue(null);
    repo.findAccountById = vi
      .fn()
      .mockResolvedValue(Account.create(uuidv7(), "account-name", "USD", new Date()));
    repo.saveTransaction = vi
      .fn()
      .mockRejectedValue(new IdempotencyConflictError("Key exists", idempotencyKey));

    const command = createTransferDTO();
    try {
      await createTransferUsecase.execute(command);
      expect.fail("Should have thrown error due to failed saveTransaction");
    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repo.saveTransaction).toHaveBeenCalledOnce();
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(IdempotencyConflictError);
      if (error instanceof IdempotencyConflictError) {
        expect(error.idempotencyKey).toBe(idempotencyKey);
      } else {
        expect.fail("Should have thrown IdempotencyConflictError");
      }
    }
  });

  it("should fail saveTransaction regardless", async () => {
    class GenericError extends Error {
      constructor(message: string) {
        super(message);
      }
    }
    repo.findAccountById = vi
      .fn()
      .mockResolvedValue(Account.create(uuidv7(), "account-name", "USD", new Date()));
    repo.saveTransaction = vi.fn().mockRejectedValue(new GenericError("Generic error"));
    const command = createTransferDTO();
    try {
      await createTransferUsecase.execute(command);
      expect.fail("Should have thrown error");
    } catch (error: unknown) {
      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(GenericError);
      if (error instanceof GenericError) {
        expect(error.message).toMatch(/Generic error/i);
      } else {
        expect.fail("Should have thrown GenericError");
      }
    }
  });
});
