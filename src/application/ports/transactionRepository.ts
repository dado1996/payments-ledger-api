import type { Money } from "../../domain/money/money.js";
import type { Entry } from "../../domain/transaction/entry.js";
import type { Transaction } from "../../domain/transaction/transaction.js";
import type { Account } from "../../domain/account/account.js";

export interface TransactionRepository {
  saveTransaction(transaction: Transaction): Promise<void>;

  findByIdempotencyKey(key: string): Promise<Transaction | null>;

  findTransferById(id: string): Promise<Transaction | null>;

  findAccountById(id: string): Promise<Account | null>;

  getAccountBalance(accountId: string): Promise<Money>;

  getEntriesForAccount(accountId: string): Promise<Entry[]>;

  getSystemBalance(): Promise<Money[]>;
}
