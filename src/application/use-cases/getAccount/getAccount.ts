import type { TransactionRepository } from "../../ports/transactionRepository.js";
import type { GetAccountDTO, GetAccountResultDTO } from "./getAccountDTO.js";

export class GetAccount {
  public constructor(private readonly transactionRepo: TransactionRepository) {}

  public async execute(command: GetAccountDTO): Promise<GetAccountResultDTO | null> {
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
