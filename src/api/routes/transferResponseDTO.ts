import type { Currency } from "../../domain/money/money.js";

export interface TransferResponseDTO {
  id: string;
  idempotencyKey: string;
  currency: Currency;
  createdAt: Date;
  entries: {
    accountId: string;
    amount: string;
  }[];
}
