import { v7 as uuidv7 } from "uuid";
import type { CreateTransferDTO } from "../../src/application/use-cases/createTransferDTO.js";

export function createTransferDTO(): CreateTransferDTO {
  return {
    idempotencyKey: `key-${uuidv7()}`,
    sourceAccountId: uuidv7(),
    destinationAccountId: uuidv7(),
    currency: "USD",
    amount: 10000n,
  };
}
