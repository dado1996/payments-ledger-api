import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransactionRepository } from "../../../../src/application/ports/transactionRepository.js";
import { GetSystemBalance } from "../../../../src/application/use-cases/getSystemBalance/getSystemBalance.js";
import { Money } from "../../../../src/domain/money/money.js";

describe("GetSystemBalance Usecase", () => {
  let repo: TransactionRepository;
  let getSystemBalanceUsecase: GetSystemBalance;

  beforeEach(() => {
    repo = {
      saveTransaction: vi.fn(),
      findByIdempotencyKey: vi.fn(),
      findTransferById: vi.fn(),
      findAccountById: vi.fn(),
      getAccountBalance: vi.fn(),
      getEntriesForAccount: vi.fn(),
      getSystemBalance: vi.fn(),
      saveAccount: vi.fn(),
    } satisfies TransactionRepository;
    getSystemBalanceUsecase = new GetSystemBalance(repo);
  });

  it("should return zero balances and mark the system as balanced when every currency is zero", async () => {
    const balances = [Money.zero("USD"), Money.zero("EUR"), Money.zero("COP")];
    repo.getSystemBalance = vi.fn().mockResolvedValue(balances);

    const result = await getSystemBalanceUsecase.execute();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.getSystemBalance).toHaveBeenCalledOnce();
    expect(result).toEqual({
      balances: [
        { currency: "USD", balance: "0" },
        { currency: "EUR", balance: "0" },
        { currency: "COP", balance: "0" },
      ],
      isBalanced: true,
    });
  });

  it("should keep all currency values and mark the system as unbalanced when any balance is not zero", async () => {
    const balances = [
      Money.fromMinorUnits(1250n, "USD"),
      Money.fromMinorUnits(-250n, "EUR"),
      Money.fromMinorUnits(0n, "COP"),
    ];
    repo.getSystemBalance = vi.fn().mockResolvedValue(balances);

    const result = await getSystemBalanceUsecase.execute();

    expect(result).toEqual({
      balances: [
        { currency: "USD", balance: "1250" },
        { currency: "EUR", balance: "-250" },
        { currency: "COP", balance: "0" },
      ],
      isBalanced: false,
    });
  });

  it("should return an empty balance list and consider the system balanced when there are no balances", async () => {
    repo.getSystemBalance = vi.fn().mockResolvedValue([]);

    const result = await getSystemBalanceUsecase.execute();

    expect(result).toEqual({
      balances: [],
      isBalanced: true,
    });
  });
});
