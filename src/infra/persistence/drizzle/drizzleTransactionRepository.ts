import { eq, sql } from "drizzle-orm";
import type { TransactionRepository } from "../../../application/ports/transactionRepository.js";
import { Money } from "../../../domain/money/money.js";
import { Transaction } from "../../../domain/transaction/transaction.js";
import { accounts, entries, transfers } from "../../db/schema.js";
import { Entry } from "../../../domain/transaction/entry.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../db/schema.js";
import { Account } from "../../../domain/account/account.js";
import { IdempotencyConflictError } from "../../../domain/errors.js";

export class DrizzleTransactionRepository implements TransactionRepository {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  public async saveTransaction(transaction: Transaction): Promise<void> {
    const snapshot = transaction.toSnapshot();
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(transfers).values({
          id: snapshot.id,
          idempotencyKey: snapshot.idempotencyKey,
          currency: snapshot.currency,
          createdAt: snapshot.createdAt,
        });
        await tx.insert(entries).values(
          [...snapshot.entries].map((entry) => {
            const entrySnapshot = entry.toSnapshot();
            return {
              id: entrySnapshot.id,
              transferId: snapshot.id,
              accountId: entrySnapshot.accountId,
              amount: entrySnapshot.amount,
              createdAt: new Date(),
            };
          }),
        );
      });
    } catch (error: unknown) {
      const postgresError = this.extractPostgresError(error);

      if (
        postgresError?.code === "23505" &&
        postgresError.constraint_name === "transfers_idempotency_key_unique"
      ) {
        throw new IdempotencyConflictError(
          "The transaction already exists",
          snapshot.idempotencyKey,
        );
      }

      throw error;
    }
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

  public async findAccountById(id: string): Promise<Account | null> {
    const result = (await this.db.select().from(accounts).where(eq(accounts.id, id)))[0];

    if (!result) return null;

    return Account.reconstitute(result.id, result.name, result.currency, result.createdAt);
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

  public async saveAccount(account: Account): Promise<void> {
    const snapshot = account.toSnapshot();
    await this.db.insert(schema.accounts).values({
      id: snapshot.id,
      name: snapshot.name,
      currency: snapshot.currency,
      createdAt: snapshot.createdAt,
    });
  }

  private extractPostgresError(
    error: unknown,
  ): { code: string | undefined; constraint_name: string | undefined } | null {
    if (!error || typeof error !== "object") {
      return null;
    }

    const candidate = error as {
      code?: unknown;
      constraint_name?: unknown;
      cause: {
        code?: unknown;
        constraint_name?: unknown;
      };
    };

    const postgresError = candidate.cause ?? candidate;

    if (typeof postgresError !== "object" || postgresError === null) {
      return null;
    }

    const result = postgresError;

    return {
      code: typeof result.code === "string" ? result.code : undefined,
      constraint_name:
        typeof result.constraint_name === "string" ? result.constraint_name : undefined,
    };
  }
}
