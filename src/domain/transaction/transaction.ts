import { Money, type Currency } from "../money/money.js";
import type { TransactionSnapshot } from "./transactionSnapshot.js";
import type { Entry } from "./entry.js";
import { UnbalancedTransactionError } from "../errors.js";

export class Transaction {
  private constructor(
    private readonly id: string,
    private readonly idempotencyKey: string,
    private readonly currency: Currency,
    private readonly timestamp: Date,
    private readonly entries: Iterable<Entry>,
  ) {
    this.currency = Transaction.toCurrency(currency);
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

  static reconstitute(
    id: string,
    idempotencyKey: string,
    timestamp: Date,
    currency: Currency,
    entries: Entry[],
  ) {
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

  static toCurrency(currency: string): Currency {
    return currency as Currency;
  }

  public toSnapshot(): TransactionSnapshot {
    return {
      id: this.id,
      idempotencyKey: this.idempotencyKey,
      currency: this.currency,
      timestamp: this.timestamp,
      entries: this.entries,
    };
  }
}
