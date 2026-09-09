import { AccountNotFoundError } from "../../../domain/errors.js";
import type { TransactionRepository } from "../../ports/transactionRepository.js";
import type { GetAccountEntriesDTO } from "../getAccountEntries/getAccountEntriesDTO.js";

export class GetAccountEntries {
  public constructor(private readonly transactionRepo: TransactionRepository) {}

  public async execute(command: GetAccountEntriesDTO) {
    const accountExists = await this.transactionRepo.findAccountById(command.id);
    if (!accountExists) {
      throw new AccountNotFoundError("The account does not exists", command.id);
    }

    const entries = await this.transactionRepo.getEntriesForAccount(command.id);
    return entries.map((entry) => {
      const snapshot = entry.toSnapshot();
      return {
        accountId: snapshot.accountId,
        amount: snapshot.amount.toString(),
      };
    });
  }
}
