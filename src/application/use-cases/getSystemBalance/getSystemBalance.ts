import type { TransactionRepository } from "../../ports/transactionRepository.js";

export class GetSystemBalance {
  public constructor(private readonly transactionRepo: TransactionRepository) {}

  public async execute() {
    const result = await this.transactionRepo.getSystemBalance();
    return result;
  }
}
