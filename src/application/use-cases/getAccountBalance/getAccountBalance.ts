import type { TransactionRepository } from "../../ports/transactionRepository.js";
import type { GetAccountBalanceDTO } from "../getAccountBalance/getAccountBalanceDTO.js";

export class GetAccountBalance {
  public constructor(private readonly transactionRepo: TransactionRepository) {}

  public async execute(command: GetAccountBalanceDTO) {
    const resultAccount = await this.transactionRepo.findAccountById(command.id);
    if (!resultAccount) {
      return null;
    }
    const resultBalance = await this.transactionRepo.getAccountBalance(command.id);
    return {
      balance: resultBalance,
      account: resultAccount,
    };
  }
}
