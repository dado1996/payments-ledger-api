import type { Account } from "../../../domain/account/account.js";
import type { Money } from "../../../domain/money/money.js";

export interface GetAccountDTO {
  id: string;
}

export interface GetAccountResultDTO {
  balance: Money;
  account: Account;
}
