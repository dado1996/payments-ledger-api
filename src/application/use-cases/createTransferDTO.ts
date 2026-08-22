import type { Currency } from "../../domain/money/money.js";

export interface CreateTransferDTO {
  idempotencyKey: string;
  sourceAccountId: string;
  destinationAccountId: string;
  currency: Currency;
  amount: bigint;
}
