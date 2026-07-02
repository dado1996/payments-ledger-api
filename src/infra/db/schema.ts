import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  check,
  unique,
  varchar,
  bigint,
  index,
} from "drizzle-orm/pg-core";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("accounts_currency_check", sql`${table.currency} IN ('USD', 'EUR', 'GBP', 'COP')`),
  ],
);

export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").primaryKey(),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).notNull(),
    currency: text("currency").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    metadata: text("metadata"),
  },
  (table) => [
    check("transfers_currency_check", sql`${table.currency} IN ('USD', 'EUR', 'GBP', 'COP')`),
    unique("transfers_idempotency_key_unique").on(table.idempotencyKey),
  ],
);

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey(),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => transfers.id, { onDelete: "restrict" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    amount: bigint("amount", { mode: "bigint" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("entries_transfer_id_idx").on(table.transferId),
    index("entries_account_id_idx").on(table.accountId),
    check("entries_amount_check", sql`${table.amount} <> 0`),
  ],
);
