import type { Currency } from "../../../domain/money/money.js";

export interface CreateAccountDTO {
  name: string;
  currency: Currency;
}
