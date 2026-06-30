export type Currency = "USD" | "EUR" | "GBP" | "COP";

export class Money {
  private readonly amount: bigint;
  private readonly currency: Currency;

  private constructor(amount: bigint, currency: Currency) {
    this.amount = amount;
    this.currency = currency;
    Object.freeze(this);
  }

  static fromMinorUnits(amount: bigint, currency: Currency): Money {
    return new Money(amount, currency);
  }

  toMinorUnits(): string {
    return this.amount.toString();
  }

  static zero(currency: Currency): Money {
    return new Money(0n, currency);
  }

  static sum(values: Iterable<Money>, currency: Currency): Money {
    let total = Money.zero(currency);
    for (const value of values) {
      total = total.add(value);
    }

    return total;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount - other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.amount === other.amount;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount >= other.amount;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  lessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount <= other.amount;
  }

  isZero(): boolean {
    return this.amount === 0n;
  }

  negate(): Money {
    return new Money(-this.amount, this.currency);
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}
