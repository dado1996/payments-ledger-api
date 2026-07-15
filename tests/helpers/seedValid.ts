import { v7 as uuidv7 } from "uuid";
import * as schema from "../../src/infra/db/schema.js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export async function seedValidEntry(
  db: PostgresJsDatabase<typeof schema>,
  amount: bigint = 1000n,
) {
  const accountId = uuidv7();
  const transferId = uuidv7();
  const entryId = uuidv7();
  const currency = "USD";

  await db.insert(schema.accounts).values({
    id: accountId,
    name: "Append Only Test Account",
    currency,
  });

  await db.insert(schema.transfers).values({
    id: transferId,
    idempotencyKey: `key-${transferId}`,
    currency,
    createdAt: new Date(),
  });

  await db.insert(schema.entries).values({
    id: entryId,
    transferId,
    accountId,
    amount,
  });

  return { accountId, transferId, entryId };
}
