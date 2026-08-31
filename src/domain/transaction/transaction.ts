import { Money, type Currency } from "../money/money.js";
import type { TransactionSnapshot } from "./transactionSnapshot.js";
import type { Entry } from "./entry.js";
import { UnbalancedTransactionError } from "../errors.js";

export class Transaction {
  private constructor(
    private readonly id: string,
    private readonly idempotencyKey: string,
    private readonly currency: Currency,
    private readonly createdAt: Date,
    private readonly entries: Iterable<Entry>,
  ) {
    this.currency = Transaction.toCurrency(currency);
    Object.freeze(this);
  }

  public getCurrency(): Currency {
    return this.currency;
  }

  public getTimestamp(): Date {
    return this.createdAt;
  }

  public getEntries(): Iterable<Entry> {
    return [...this.entries];
  }

  static create(
    id: string,
    idempotencyKey: string,
    createdAt: Date,
    currency: Currency,
    entries: Entry[],
  ): Transaction {
    Transaction.assertBalance(entries, currency);
    return new Transaction(id, idempotencyKey, currency, createdAt, entries);
  }

  static reconstitute(
    id: string,
    idempotencyKey: string,
    createdAt: Date,
    currency: Currency,
    entries: Entry[],
  ) {
    return new Transaction(id, idempotencyKey, currency, createdAt, entries);
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
      createdAt: this.createdAt,
      entries: this.entries,
    };
  }
}
