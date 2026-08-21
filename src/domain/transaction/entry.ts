import type { EntrySnapshot } from "./entrySnapshot.js";
import { Money, type Currency } from "../money/money.js";
import { InvalidEntryError } from "../errors.js";
import { v7 as uuidv7 } from "uuid";
import type { AccountId } from "../shared/shared.js";

export class Entry {
  private readonly id: string;
  private readonly accountId: AccountId;
  private readonly amount: bigint;

  private constructor(accountId: string, amount: bigint) {
    this.id = uuidv7();
    this.accountId = accountId;
    this.amount = amount;
    Object.freeze(this);
  }

  static create(accountId: string, amount: bigint): Entry {
    if (!accountId) {
      throw new InvalidEntryError("Invalid account", accountId);
    }
    if (amount === 0n) {
      throw new InvalidEntryError("Entry amount must be non-zero", accountId);
    }
    return new Entry(accountId, amount);
  }

  static reconstitute(accountId: string, amount: bigint): Entry {
    return new Entry(accountId, amount);
  }

  toMoney(currency: Currency): Money {
    return Money.fromMinorUnits(this.amount, currency);
  }

  public toSnapshot(): EntrySnapshot {
    return {
      id: this.id,
      accountId: this.accountId,
      amount: this.amount,
    };
  }
}
