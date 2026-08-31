import type { Currency } from "../money/money.js";
import type { Entry } from "./entry.js";

export interface TransactionSnapshot {
  id: string;
  idempotencyKey: string;
  currency: Currency;
  createdAt: Date;
  entries: Iterable<Entry>;
}
