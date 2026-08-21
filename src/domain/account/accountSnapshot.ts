import type { Currency } from "../money/money.js";

export interface AccountSnapshot {
  id: string;
  name: string;
  currency: Currency;
  timestamp: Date;
}
