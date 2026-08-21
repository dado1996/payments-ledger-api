import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import * as schema from "../../src/infra/db/schema.js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql } from "drizzle-orm";
import { DrizzleTransactionRepository } from "../../src/infra/persistence/drizzle/drizzleTransactionRepository.js";
import { Transaction } from "../../src/domain/transaction/transaction.js";
import { v7 as uuidv7 } from "uuid";
import { Entry } from "../../src/domain/transaction/entry.js";
import { isDrizzlePostgresError } from "../helpers/drizzleErrorWrapper.js";
import { seedValidEntry } from "../helpers/seedValid.js";
import { Money } from "../../src/domain/money/money.js";
import { IdempotencyConflictError } from "../../src/domain/errors.js";

describe("Drizzle Integration Tests", () => {
  let container: StartedPostgreSqlContainer;
  let client: postgres.Sql;
  let db: PostgresJsDatabase<typeof schema>;
  let drizzleTransactionRepository: DrizzleTransactionRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:17").start();
    const connectionString = container.getConnectionUri();

    client = postgres(connectionString, { max: 1 });
    db = drizzle(client, { schema });
    drizzleTransactionRepository = new DrizzleTransactionRepository(db);

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

  it("can save a transaction succesfully", async () => {
    const accountId = uuidv7();
    await db.insert(schema.accounts).values({
      id: accountId,
      name: "account-name",
      currency: "USD",
    });
    const transferId = uuidv7();
    const idempotencyKey = `key-${uuidv7()}`;
    const timestamp = new Date();
    const currency = "USD";
    await drizzleTransactionRepository.saveTransaction(
      Transaction.create(transferId, `${idempotencyKey}`, timestamp, currency, [
        Entry.create(accountId, 100n),
        Entry.create(accountId, -100n),
      ]),
    );

    const transactionAssert = await db
      .select()
      .from(schema.transfers)
      .where(sql`${schema.transfers.id}=${transferId}`);
    expect(transactionAssert).toHaveLength(1);
    expect(transactionAssert[0]?.idempotencyKey).toBe(idempotencyKey);
    expect(transactionAssert[0]?.createdAt).toStrictEqual(timestamp);
    expect(transactionAssert[0]?.currency).toBe(currency);

    const entriesAssert = await db
      .select({
        amount: schema.entries.amount,
      })
      .from(schema.entries)
      .where(sql`${schema.entries.transferId}=${transferId}`);

    expect(entriesAssert).toHaveLength(2);

    const entriesSet = entriesAssert.map((entry) => entry.amount);
    expect(entriesSet).toContain(100n);
    expect(entriesSet).toContain(-100n);
  });

  it("fails to save transaction due to idempotency conflict", async () => {
    const accountId = uuidv7();
    await db.insert(schema.accounts).values({
      id: accountId,
      name: "account-name",
      currency: "USD",
      createdAt: new Date(),
    });

    const key = `key-${uuidv7()}`;
    const firstEntries = [Entry.create(accountId, 2000n), Entry.create(accountId, -2000n)];
    const firstTransaction = Transaction.create(uuidv7(), key, new Date(), "USD", firstEntries);
    await drizzleTransactionRepository.saveTransaction(firstTransaction);

    const secondEntries = [Entry.create(accountId, 1000n), Entry.create(accountId, -1000n)];
    const secondTransaction = Transaction.create(uuidv7(), key, new Date(), "USD", secondEntries);
    try {
      await drizzleTransactionRepository.saveTransaction(secondTransaction);
      expect.fail("The transaction should have failed due to idempotency conflict");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(IdempotencyConflictError);
      if (error instanceof IdempotencyConflictError) {
        expect(error.code).toBe("DUPLICATE_TRANSFER");
        expect(error.message).toMatch(/The transaction already exists/i);
      } else {
        expect.fail("The error should have been an IdempotencyConflictError");
      }
    }
  });

  it("fails because accountId does not exist", async () => {
    const invalidAccountId = uuidv7();
    const entry1 = Entry.create(invalidAccountId, 100n);
    const entry2 = Entry.create(invalidAccountId, -100n);
    const transferId = uuidv7();
    try {
      await drizzleTransactionRepository.saveTransaction(
        Transaction.create(transferId, `key-${uuidv7()}`, new Date(), "USD", [entry1, entry2]),
      );
      expect.fail(
        "Expected saveTransaction to throw an error due to foreign key constraint violation",
      );
    } catch (error: unknown) {
      if (isDrizzlePostgresError(error)) {
        expect(error.cause.code).toBe("23503"); // Foreign key violation
        expect(error.cause.message).toMatch(
          /insert or update on table "entries" violates foreign key constraint "entries_account_id_accounts_id_fk"/i,
        );
      } else {
        expect.fail("Expected to throw a drizzle postgres error");
      }
    }

    const transferAssert = await db
      .select()
      .from(schema.transfers)
      .where(sql`${schema.transfers.id}=${transferId}`);
    expect(transferAssert).toHaveLength(0);
    const transferAssert2 = await drizzleTransactionRepository.findTransferById(transferId);
    expect(transferAssert2).toBeNull();
  });

  it("should find a transaction based on an idempotency key", async () => {
    const id = uuidv7();
    const idempotencyKey = `key-${uuidv7()}`;
    const timestamp = new Date();
    const { accountId } = await seedValidEntry(db);
    await db.insert(schema.transfers).values({
      id: id,
      idempotencyKey,
      createdAt: timestamp,
      currency: "COP",
    });
    await db.insert(schema.entries).values([
      {
        id: uuidv7(),
        accountId,
        transferId: id,
        amount: 100n,
      },
      {
        id: uuidv7(),
        accountId,
        transferId: id,
        amount: -100n,
      },
    ]);
    const transferAssert = await drizzleTransactionRepository.findByIdempotencyKey(idempotencyKey);
    expect(transferAssert).not.toBeNull();
    expect(transferAssert?.getCurrency()).toBe("COP");
    expect(transferAssert?.getTimestamp()).toStrictEqual(timestamp);
    expect(transferAssert?.getEntries()).toHaveLength(2);
  });

  it("should find by an idempotency key but return null", async () => {
    const idempotencyKey = uuidv7();

    const transferAssert = await drizzleTransactionRepository.findByIdempotencyKey(idempotencyKey);
    expect(transferAssert).toBeNull();
  });

  it("should throw because of only 1 entry", async () => {
    const id = uuidv7();
    const idempotencyKey = `key-${uuidv7()}`;
    const timestamp = new Date();
    const { accountId } = await seedValidEntry(db);
    await db.insert(schema.transfers).values({
      id: id,
      idempotencyKey,
      createdAt: timestamp,
      currency: "COP",
    });
    await db.insert(schema.entries).values([
      {
        id: uuidv7(),
        accountId,
        transferId: id,
        amount: 100n,
      },
    ]);

    try {
      await drizzleTransactionRepository.findByIdempotencyKey(idempotencyKey);
      expect.fail("Expected to throw due to inconsisten number of entries");
    } catch (error: unknown) {
      if (error instanceof Error) {
        expect(error.message).toMatch(/Corrupted transfer/i);
      } else {
        expect.fail("Expected to throw a different error");
      }
    }
  });

  it("should return the balance of the account", async () => {
    const accountId = uuidv7();
    const transferId = uuidv7();
    await db.insert(schema.accounts).values({
      id: accountId,
      name: "account-name",
      currency: "USD",
    });
    await db.insert(schema.transfers).values({
      id: transferId,
      idempotencyKey: `key-${transferId}`,
      currency: "USD",
      createdAt: new Date(),
    });
    await db.insert(schema.entries).values([
      {
        id: uuidv7(),
        accountId,
        transferId,
        amount: 1000n,
      },
      {
        id: uuidv7(),
        accountId,
        transferId,
        amount: -1000n,
      },
      {
        id: uuidv7(),
        accountId,
        transferId,
        amount: -500n,
      },
      {
        id: uuidv7(),
        accountId,
        transferId,
        amount: 2000n,
      },
      {
        id: uuidv7(),
        accountId,
        transferId,
        amount: 200n,
      },
    ]);

    const balanceAssert = await drizzleTransactionRepository.getAccountBalance(accountId);
    expect(balanceAssert).toBeInstanceOf(Money);
    expect(balanceAssert.toMinorUnits()).toBe("1700");
  });

  it("should return the balance to zero", async () => {
    const accountId = uuidv7();
    const transferId = uuidv7();
    await db.insert(schema.accounts).values({
      id: accountId,
      name: "account-name",
      currency: "USD",
    });
    await db.insert(schema.transfers).values({
      id: transferId,
      idempotencyKey: `key-${transferId}`,
      currency: "USD",
      createdAt: new Date(),
    });
    await db.insert(schema.entries).values([
      {
        id: uuidv7(),
        accountId,
        transferId,
        amount: 1000n,
      },
      {
        id: uuidv7(),
        accountId,
        transferId,
        amount: 3000n,
      },
      {
        id: uuidv7(),
        accountId,
        transferId,
        amount: -1000n,
      },
      {
        id: uuidv7(),
        accountId,
        transferId,
        amount: -3000n,
      },
    ]);

    const balanceAssert = await drizzleTransactionRepository.getAccountBalance(accountId);
    expect(balanceAssert).toBeInstanceOf(Money);
    expect(balanceAssert.toMinorUnits()).toBe("0");
  });

  it("should return the system balance", async () => {
    const accountId = uuidv7();
    const transferId1 = uuidv7();
    const transferId2 = uuidv7();
    const transferId3 = uuidv7();
    await db.insert(schema.accounts).values({
      id: accountId,
      name: "account-name",
      currency: "USD",
    });
    await db.insert(schema.transfers).values([
      {
        id: transferId1,
        idempotencyKey: `key-${transferId1}`,
        currency: "USD",
        createdAt: new Date(),
      },
      {
        id: transferId2,
        idempotencyKey: `key-${transferId2}`,
        currency: "GBP",
        createdAt: new Date(),
      },
      {
        id: transferId3,
        idempotencyKey: `key-${transferId3}`,
        currency: "COP",
        createdAt: new Date(),
      },
    ]);
    await db.insert(schema.entries).values([
      {
        id: uuidv7(),
        transferId: transferId1,
        accountId,
        amount: 300n,
      },
      {
        id: uuidv7(),
        transferId: transferId1,
        accountId,
        amount: -300n,
      },
      {
        id: uuidv7(),
        transferId: transferId2,
        accountId,
        amount: 1000n,
      },
      {
        id: uuidv7(),
        transferId: transferId2,
        accountId,
        amount: -1n,
      },
      {
        id: uuidv7(),
        transferId: transferId3,
        accountId,
        amount: 342534n,
      },
      {
        id: uuidv7(),
        transferId: transferId3,
        accountId,
        amount: -3453n,
      },
    ]);

    const systemAssert = await drizzleTransactionRepository.getSystemBalance();
    expect(systemAssert[0]).toBeInstanceOf(Money);
    expect(systemAssert).toHaveLength(3);

    const usdMoney = systemAssert.find((money) => money.getCurrency() === "USD");
    const gbpMoney = systemAssert.find((money) => money.getCurrency() === "GBP");
    const copMoney = systemAssert.find((money) => money.getCurrency() === "COP");
    expect(usdMoney?.toMinorUnits()).toBe("0");
    expect(gbpMoney?.toMinorUnits()).toBe("999");
    expect(copMoney?.toMinorUnits()).toBe("339081");
  });
});
