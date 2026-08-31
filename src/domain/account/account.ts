import type { Currency } from "../money/money.js";
import type { AccountSnapshot } from "./accountSnapshot.js";

export class Account {
  private readonly id: string;
  private readonly name: string;
  private readonly currency: Currency;
  private readonly createdAt: Date;

  private constructor(id: string, name: string, currency: Currency, createdAt: Date) {
    this.id = id;
    this.name = name;
    this.currency = currency;
    this.createdAt = createdAt;
    Object.freeze(this);
  }

  public static create(id: string, name: string, currency: Currency, createdAt: Date) {
    return new Account(id, name, currency, createdAt);
  }

  public static reconstitute(id: string, name: string, currency: Currency, createdAt: Date) {
    return new Account(id, name, currency, createdAt);
  }

  public getCurrency(): Currency {
    return this.currency;
  }

  public toSnapshot(): AccountSnapshot {
    return {
      id: this.id,
      name: this.name,
      currency: this.currency,
      createdAt: this.createdAt,
    };
  }
}
