import { describe, expect, it } from "vitest";
import { Entry, Transaction } from "../../src/domain/ledger.js";
import { Money } from "../../src/domain/money.js";
import { InvalidEntryError, UnbalancedTransactionError } from "../../src/domain/errors.js";

describe("Entry tests", () => {
  it("should create an entry", () => {
    const entry = Entry.create("abc_123", 1000n);
    expect(entry).toBeInstanceOf(Entry);

    const negativeEntry = Entry.create("abc_123", -1000n);
    expect(negativeEntry).toBeInstanceOf(Entry);
  });

  it("should fail to create an entry due to invalid id", () => {
    expect(() => Entry.create("", 1000n)).toThrow(InvalidEntryError);
  });

  it("should fail to create an entry due to invalid amount", () => {
    expect(() => Entry.create("abc_123", 0n)).toThrow(InvalidEntryError);
  });

  it("should return a Money instance", () => {
    const entry = Entry.create("abc_123", 1000n);
    expect(entry.toMoney("USD")).toEqual(Money.fromMinorUnits(1000n, "USD"));
  });
});

describe("Transaction tests", () => {
  it("should create a new transaction", () => {
    const entries = [Entry.create("abc_123", 1000n), Entry.create("bcd_456", -1000n)];
    const ts = new Date();
    const transaction = Transaction.create("abc_123", "asfasda", ts, "USD", entries);
    expect(transaction).toBeInstanceOf(Transaction);
    expect(transaction.getCurrency()).toBe("USD");
    expect(transaction.getTimestamp()).toEqual(ts);
    expect(transaction.getEntries()).toContain(entries[0]);
  });

  it("should fail when trying to mutate the entries", () => {
    const entries = [Entry.create("abc_123", 1000n), Entry.create("bcd_456", -1000n)];
    const transaction = Transaction.create("abc_123", "asdasfas", new Date(), "USD", entries);
    const returnedEntries = transaction.getEntries();
    (returnedEntries as Entry[]).push(Entry.create("123456", 3000n));
    expect(transaction.getEntries()).toHaveLength(2);
  });

  it("should fail to create transaction due to less than 2 entries", () => {
    const entries = [Entry.create("bcd_456", 1000n)];

    expect(() => Transaction.create("abc_123", "asfasda", new Date(), "USD", entries)).toThrow(
      UnbalancedTransactionError,
    );
  });

  it("should fail to create transaction due to misbalance", () => {
    const entries = [Entry.create("abc_123", 1000n), Entry.create("bcd_456", 2000n)];

    expect(() => Transaction.create("abc_123", "asfasda", new Date(), "USD", entries)).toThrow(
      UnbalancedTransactionError,
    );
  });

  it("should include the correct imbalance in the thrown error", () => {
    const entries = [Entry.create("a", 1000n), Entry.create("b", 500n)];

    try {
      Transaction.create("tx", "description", new Date(), "USD", entries);
      throw new Error("Expected transaction creation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(UnbalancedTransactionError);
      expect((error as UnbalancedTransactionError).delta?.toMinorUnits()).toBe("1500");
    }
  });
});
