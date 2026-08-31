import type { TransactionRepository } from "../../ports/transactionRepository.js";
import type { GetAccountEntriesDTO } from "../getAccountEntries/getAccountEntriesDTO.js";

export class GetAccountEntries {
  public constructor(private readonly transactionRepo: TransactionRepository) {}

  public async execute(command: GetAccountEntriesDTO) {
    const entries = await this.transactionRepo.getEntriesForAccount(command.id);
    return entries;
  }
}
