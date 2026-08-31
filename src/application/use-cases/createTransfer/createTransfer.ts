import {
  AccountNotFoundError,
  CurrencyMismatchError,
  IdempotencyConflictError,
} from "../../../domain/errors.js";
import { Entry } from "../../../domain/transaction/entry.js";
import { Transaction } from "../../../domain/transaction/transaction.js";
import type { TransactionRepository } from "../../ports/transactionRepository.js";
import { v7 as uuidv7 } from "uuid";
import type { CreateTransferDTO } from "../createTransfer/createTransferDTO.js";

export class CreateTransfer {
  public constructor(private readonly transactionRepo: TransactionRepository) {}

  public async execute(command: CreateTransferDTO): Promise<Transaction> {
    const transaction = await this.transactionRepo.findByIdempotencyKey(command.idempotencyKey);
    if (transaction) {
      return transaction;
    }

    const [sourceAccount, destinationAccount] = await Promise.all([
      this.transactionRepo.findAccountById(command.sourceAccountId),
      this.transactionRepo.findAccountById(command.destinationAccountId),
    ]);

    if (!sourceAccount) {
      throw new AccountNotFoundError("The source account was not found", command.sourceAccountId);
    }

    if (!destinationAccount) {
      throw new AccountNotFoundError(
        "The destination account was not found",
        command.destinationAccountId,
      );
    }

    if (
      sourceAccount.getCurrency() !== command.currency ||
      destinationAccount.getCurrency() !== command.currency
    ) {
      throw new CurrencyMismatchError(
        "The currency of the transfer does not correspond to currency of the account(s)",
        command.currency,
      );
    }

    const transferId = uuidv7();
    const entries = [
      Entry.create(command.sourceAccountId, -command.amount),
      Entry.create(command.destinationAccountId, command.amount),
    ];
    const newTransaction = Transaction.create(
      transferId,
      command.idempotencyKey,
      new Date(),
      command.currency,
      entries,
    );

    try {
      await this.transactionRepo.saveTransaction(newTransaction);
    } catch (error: unknown) {
      if (error instanceof IdempotencyConflictError) {
        const transactionFirst = await this.transactionRepo.findByIdempotencyKey(
          error.idempotencyKey,
        );
        if (transactionFirst) {
          return transactionFirst;
        }
        throw error;
      }
      throw error;
    }

    return newTransaction;
  }
}
