import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { v7 as uuidv7 } from "uuid";
import * as schema from "../../src/infra/db/schema.js";
import type { Currency } from "../../src/domain/money.js";
import { seedValidEntry } from "../helpers/seedValid.js";

interface PostgresDriverError {
  code: string;
  message: string;
}

interface DrizzleWrappedError {
  cause: PostgresDriverError;
}

function isDrizzlePostgresError(error: unknown): error is DrizzleWrappedError {
  if (typeof error !== "object" || error === null) return false;

  // Extract and check the nested 'cause' property
  const hasCause = "cause" in error;
  if (!hasCause) return false;

  const cause = (error as Record<string, unknown>).cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    "message" in cause &&
    typeof (cause as Record<string, unknown>).code === "string" &&
    typeof (cause as Record<string, unknown>).message === "string"
  );
}

describe("Database Schema & Triggers Integration", () => {
  let container: StartedPostgreSqlContainer;
  let client: postgres.Sql;
  let db: PostgresJsDatabase<typeof schema>;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17").start();
    const connectionString = container.getConnectionUri();

    client = postgres(connectionString, { max: 1 });
    db = drizzle(client, { schema });

    await migrate(db, { migrationsFolder: "./migrations" });
  }, 60_000); // Fail-safe local hook timeout

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE entries, transfers, accounts RESTART IDENTITY CASCADE;`);
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
    if (container) {
      await container.stop();
    }
  }, 10_000);

  it("harness plumbing boots, migrates, and tears down cleanly", () => {
    expect(db).toBeDefined();
    expect(sql).toBeDefined();
  });

  it("happy path: inserts matching graph and round-trips bigint money exactly", async () => {
    const account1Id = uuidv7();
    const account2Id = uuidv7();
    const transferId = uuidv7();
    const entry1Id = uuidv7();
    const entry2Id = uuidv7();

    const currency: Currency = "USD";

    const account1 = { id: account1Id, name: "Test Acc 1", currency };
    const account2 = { id: account2Id, name: "Test Acc 2", currency };

    const transfer = {
      id: transferId,
      idempotencyKey: `key-${transferId}`,
      currency,
      createdAt: new Date(),
    };

    const entryPositive = {
      id: entry1Id,
      transferId,
      accountId: account1Id,
      amount: 1000n, // $10.00
    };

    const entryNegative = {
      id: entry2Id,
      transferId,
      accountId: account2Id,
      amount: -1000n,
    };

    await db.insert(schema.accounts).values([account1, account2]);
    await db.insert(schema.transfers).values(transfer);
    await db.insert(schema.entries).values([entryPositive, entryNegative]);

    const savedEntries = await db
      .select()
      .from(schema.entries)
      .where(sql`${schema.entries.id} = ${entry1Id}`);
    expect(savedEntries).toHaveLength(1);

    const row = savedEntries[0];
    expect(typeof row?.amount).toBe("bigint");
    expect(row?.amount).toBe(1000n);
  });

  it("append-only UPDATE: trigger rejects mutation with custom error message", async () => {
    const { entryId } = await seedValidEntry(db);

    try {
      await db
        .update(schema.entries)
        .set({ amount: 999n })
        .where(sql`${schema.entries.id} = ${entryId}`);

      expect.fail("Database allowed an UPDATE operation on an append-only ledger table!");
    } catch (err: unknown) {
      if (isDrizzlePostgresError(err)) {
        expect(err.cause.code).toBe("P0001");
        expect(err.cause.message).toMatch(/Update and delete operations are not allowed/i);
      } else {
        expect.fail("Thrown error was not a recognizable Drizzle Postgres exception");
      }
    }
  });

  it("append-only DELETE: trigger rejects mutation with custom error message", async () => {
    const { entryId } = await seedValidEntry(db);

    try {
      await db.delete(schema.entries).where(sql`${schema.entries.id} = ${entryId}`);
      expect.fail("Database allowed a DELETE operation on an append-only ledger table!");
    } catch (err: unknown) {
      if (isDrizzlePostgresError(err)) {
        expect(err.cause.code).toBe("P0001");
        expect(err.cause.message).toMatch(/Update and delete operations are not allowed/i);
      } else {
        expect.fail("Thrown error was not a recognizable Drizzle Postgres exception");
      }
    }
  });

  it("reusing idempotency key: inserting unique constraint with custom error message", async () => {
    try {
      const { transferId } = await seedValidEntry(db);
      await db.insert(schema.transfers).values({
        id: uuidv7(),
        idempotencyKey: `key-${transferId}`,
        currency: "USD",
        createdAt: new Date(),
      });
      expect.fail("Database allowed a duplicate idempotency key insertion on transfers table!");
    } catch (err: unknown) {
      if (isDrizzlePostgresError(err)) {
        expect(err.cause.code).toBe("23505");
        expect(err.cause.message).toMatch(
          /Duplicate key value violates unique constraint "transfers_idempotency_key_unique"/i,
        );
      } else {
        expect.fail("Thrown error was not a recognizable Drizzle Postgres exception");
      }
    }
  });

  it("non-zero amounts: it should allow to create an entry with a non-zero amount", async () => {
    const { transferId, accountId } = await seedValidEntry(db);
    const result = await db
      .insert(schema.entries)
      .values({
        id: uuidv7(),
        transferId,
        accountId,
        amount: -500n,
      })
      .returning();
    expect(result).toBeDefined();
    expect(result).toHaveLength(1);
    expect(result[0]?.amount).toBe(-500n);
  });

  it("non-zero amounts: trigger rejects entries with zero amount with custom error message", async () => {
    try {
      const { transferId, accountId } = await seedValidEntry(db);
      await db.insert(schema.entries).values({
        id: uuidv7(),
        transferId,
        accountId,
        amount: 0n,
      });
      expect.fail("Database allowed an entry with zero amount to be inserted!");
    } catch (err: unknown) {
      if (isDrizzlePostgresError(err)) {
        expect(err.cause.code).toBe("23514");
        expect(err.cause.message).toMatch(
          /new row for relation "entries" violates check constraint "entries_amount_check"/i,
        );
      } else {
        expect.fail("Thrown error was not a recognizable Drizzle Postgres exception");
      }
    }
  });

  it("FK restrict: rejects deletion of referenced account with custom error message", async () => {
    try {
      const { accountId } = await seedValidEntry(db);

      await db.delete(schema.accounts).where(sql`${schema.accounts.id} = ${accountId}`);
      expect.fail("Database allowed deletion of an account that is referenced by entries!");
    } catch (err: unknown) {
      if (isDrizzlePostgresError(err)) {
        expect(err.cause.code).toBe("23503");
        expect(err.cause.message).toMatch(/foreign key constraint/i);
      } else {
        expect.fail("Thrown error was not a recognizable Drizzle Postgres exception");
      }
    }
  });

  it("Currency check: trigger reject accounts with invalid currency", async () => {
    try {
      await db.insert(schema.accounts).values({
        id: uuidv7(),
        name: "Invalid currency account",
        currency: "XYZ" as Currency,
      });
      expect.fail("Database allowed an account with an invalid currency to be inserted!");
    } catch (err: unknown) {
      if (isDrizzlePostgresError(err)) {
        expect(err.cause.code).toBe("23514");
        expect(err.cause.message).toMatch(
          /new row for relation "accounts" violates check constraint "accounts_currency_check"/i,
        );
      } else {
        expect.fail("Thrown error was not a recognizable Drizzle Postgres exception");
      }
    }
  });

  it("Currency check: trigger reject transfers with invalid currency", async () => {
    try {
      await db.insert(schema.transfers).values({
        id: uuidv7(),
        idempotencyKey: `key-${uuidv7()}`,
        currency: "XYZ" as Currency,
        createdAt: new Date(),
      });
      expect.fail("Database allowed an account with an invalid currency to be inserted!");
    } catch (err: unknown) {
      if (isDrizzlePostgresError(err)) {
        expect(err.cause.code).toBe("23514");
        expect(err.cause.message).toMatch(
          /new row for relation "transfers" violates check constraint "transfers_currency_check"/i,
        );
      } else {
        expect.fail("Thrown error was not a recognizable Drizzle Postgres exception");
      }
    }
  });
});
