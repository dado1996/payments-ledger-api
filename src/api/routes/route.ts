import type { Transaction } from "../../domain/transaction/transaction.js";
import type { TransferResponseDTO } from "./transferResponseDTO.js";

export function toTransferResponse(transaction: Transaction): TransferResponseDTO {
  const snapshot = transaction.toSnapshot();
  return {
    id: snapshot.id,
    idempotencyKey: snapshot.idempotencyKey,
    currency: snapshot.currency,
    createdAt: snapshot.createdAt,
    entries: [...snapshot.entries].map((entry) => ({
      accountId: entry.toSnapshot().accountId,
      amount: entry.toSnapshot().amount.toString(),
    })),
  };
}
