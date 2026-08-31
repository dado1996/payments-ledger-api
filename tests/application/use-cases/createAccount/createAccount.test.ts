import { describe, vi, beforeEach, expect, it } from "vitest";
import { CreateAccount } from "../../../../src/application/use-cases/createAccount/createAccount.js";
import type { TransactionRepository } from "../../../../src/application/ports/transactionRepository.js";
import type { CreateAccountDTO } from "../../../../src/application/use-cases/createAccount/createAccountDTO.js";
import { Account } from "../../../../src/domain/account/account.js";

describe("Application create account", () => {
  let createAccountUsecase: CreateAccount;
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
    createAccountUsecase = new CreateAccount(repo);
  });

  it("should execute the create account succesfully", async () => {
    const command: CreateAccountDTO = {
      name: "account-name",
      currency: "USD",
    };
    const result = await createAccountUsecase.execute(command);
    const snapshot = result.toSnapshot();

    expect(snapshot.name).toBe(command.name);
    expect(snapshot.currency).toBe(command.currency);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.saveAccount).toHaveBeenCalledWith(
      Account.create(snapshot.id, snapshot.name, snapshot.currency, snapshot.createdAt),
    );
  });
});
