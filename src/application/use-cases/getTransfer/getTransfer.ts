import type { TransactionRepository } from "../../ports/transactionRepository.js";
import type { GetTransferDTO } from "../getTransfer/getTransferDTO.js";

export class GetTransfer {
  public constructor(private readonly transactionRepo: TransactionRepository) {}

  public async execute(command: GetTransferDTO) {
    const result = await this.transactionRepo.findTransferById(command.id);
    return result;
  }
}
