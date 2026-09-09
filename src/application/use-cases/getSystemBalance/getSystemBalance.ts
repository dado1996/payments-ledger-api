import type { TransactionRepository } from "../../ports/transactionRepository.js";

export class GetSystemBalance {
  public constructor(private readonly transactionRepo: TransactionRepository) {}

  public async execute() {
    const systemBalance = await this.transactionRepo.getSystemBalance();
    const result = systemBalance.map((item) => ({
      currency: item.getCurrency(),
      balance: item.toMinorUnits(),
    }));
    return { balances: result, isBalanced: systemBalance.every((m) => m.isZero()) };
  }
}
