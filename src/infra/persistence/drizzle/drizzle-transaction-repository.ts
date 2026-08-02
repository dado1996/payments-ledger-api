import { eq, sql } from "drizzle-orm";
import type { TransactionRepository } from "../../../application/ports/transaction-repository.js";
import { Money } from "../../../domain/money/money.js";
import { Transaction } from "../../../domain/transaction/transaction.js";
import { db } from "../../db/client.js";
import { accounts, entries, transfers } from "../../db/schema.js";
import { Entry } from "../../../domain/transaction/entry.js";

export class DrizzleTransactionRepository implements TransactionRepository {
  private readonly db = db;

  public async saveTransaction(transaction: Transaction): Promise<void> {
    const snapshot = transaction.toSnapshot();
    await this.db.transaction(async (tx) => {
      await tx.insert(transfers).values({
        id: snapshot.id,
        idempotencyKey: snapshot.idempotencyKey,
        currency: snapshot.currency,
        createdAt: snapshot.timestamp,
      });
      await tx.insert(entries).values(
        [...snapshot.entries].map((entry) => {
          const entrySnapshot = entry.toSnapshot();
          return {
            id: entrySnapshot.id,
            transferId: snapshot.id,
            accountId: entrySnapshot.accountId,
            amount: entrySnapshot.amount,
          };
        }),
      );
    });
  }

  public async findByIdempotencyKey(key: string): Promise<Transaction | null> {
    const transactionResult = (
      await this.db.select().from(transfers).where(eq(transfers.idempotencyKey, key))
    )[0];

    if (!transactionResult) {
      return null;
    }

    const entriesResult = await this.db
      .select()
      .from(entries)
      .where(eq(entries.transferId, transactionResult.id));

    if (entriesResult.length < 2) {
      throw new Error("Corrupted transfer");
    }

    return Transaction.reconstitute(
      transactionResult.id,
      transactionResult.idempotencyKey,
      transactionResult.createdAt,
      transactionResult.currency,
      entriesResult.map((entry) => Entry.create(entry.accountId, entry.amount)),
    );
  }

  public async findTransferById(id: string): Promise<Transaction | null> {
    const transfersResult = (await this.db.select().from(transfers).where(eq(transfers.id, id)))[0];

    if (!transfersResult) {
      return null;
    }

    const entriesResult = await this.db.select().from(entries).where(eq(entries.transferId, id));

    if (entriesResult.length < 2) {
      throw new Error("Corrupted transfer");
    }

    return Transaction.reconstitute(
      transfersResult.id,
      transfersResult.idempotencyKey,
      transfersResult.createdAt,
      transfersResult.currency,
      entriesResult.map((entry) => Entry.create(entry.accountId, entry.amount)),
    );
  }

  public async getAccountBalance(accountId: string): Promise<Money> {
    const accountResult = (
      await this.db.select().from(accounts).where(eq(accounts.id, accountId))
    )[0];

    if (!accountResult) {
      throw new Error("Account not found");
    }

    const entriesResult = (
      await this.db
        .select({
          balance: sql<string>`COALESCE(SUM(${entries.amount}), 0)`,
        })
        .from(entries)
        .where(eq(entries.accountId, accountId))
    )[0];

    return Money.fromMinorUnits(BigInt(entriesResult!.balance), accountResult.currency);
  }

  public async getEntriesForAccount(accountId: string): Promise<Entry[]> {
    const entriesResult = await this.db
      .select()
      .from(entries)
      .where(eq(entries.accountId, accountId));
    return entriesResult.map((entry) => Entry.reconstitute(entry.accountId, entry.amount));
  }

  public async getSystemBalance(): Promise<Money[]> {
    const entriesResult = await this.db
      .select({
        currency: transfers.currency,
        balance: sql<string>`COALESCE(SUM(${entries.amount}), 0)`,
      })
      .from(entries)
      .innerJoin(transfers, eq(transfers.id, entries.transferId))
      .groupBy(transfers.currency);

    return entriesResult.map((row) => Money.fromMinorUnits(BigInt(row.balance), row.currency));
  }
}
