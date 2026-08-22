import type { Currency } from "../money/money.js";
import type { AccountSnapshot } from "./accountSnapshot.js";

export class Account {
  private readonly id: string;
  private readonly name: string;
  private readonly currency: Currency;
  private readonly timestamp: Date;

  private constructor(id: string, name: string, currency: Currency, timestamp: Date) {
    this.id = id;
    this.name = name;
    this.currency = currency;
    this.timestamp = timestamp;
    Object.freeze(this);
  }

  public static create(id: string, name: string, currency: Currency, timestamp: Date) {
    return new Account(id, name, currency, timestamp);
  }

  public static reconstitute(id: string, name: string, currency: Currency, timestamp: Date) {
    return new Account(id, name, currency, timestamp);
  }

  public getCurrency(): Currency {
    return this.currency;
  }

  public toSnapshot(): AccountSnapshot {
    return {
      id: this.id,
      name: this.name,
      currency: this.currency,
      timestamp: this.timestamp,
    };
  }
}
