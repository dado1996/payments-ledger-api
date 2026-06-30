import { InvalidEntryError, UnbalancedTransactionError } from "./errors.js";
import { Money, type Currency } from "./money.js";

export type AccountId = string;

export class Entry {
  private readonly accountId: AccountId;
  private readonly amount: bigint;

  private constructor(accountId: string, amount: bigint) {
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

  toMoney(currency: Currency): Money {
    return Money.fromMinorUnits(this.amount, currency);
  }
}

export class Transaction {
  private constructor(
    private readonly id: string,
    private readonly idempotencyKey: string,
    private readonly currency: Currency,
    private readonly timestamp: Date,
    private readonly entries: Iterable<Entry>,
  ) {
    Object.freeze(this);
  }

  public getCurrency(): Currency {
    return this.currency;
  }

  public getTimestamp(): Date {
    return this.timestamp;
  }

  public getEntries(): Iterable<Entry> {
    return [...this.entries];
  }

  static create(
    id: string,
    idempotencyKey: string,
    timestamp: Date,
    currency: Currency,
    entries: Entry[],
  ): Transaction {
    Transaction.assertBalance(entries, currency);
    return new Transaction(id, idempotencyKey, currency, timestamp, entries);
  }

  static assertBalance(entries: Entry[], currency: Currency): void {
    if (entries.length < 2)
      throw new UnbalancedTransactionError("Less than 2 entries", Money.zero(currency));

    const sumMoney = Money.sum(
      entries.map((e) => e.toMoney(currency)),
      currency,
    );
    const isZero = sumMoney.isZero();
    if (!isZero) {
      throw new UnbalancedTransactionError("Entries are unbalanced", sumMoney);
    }
  }
}
