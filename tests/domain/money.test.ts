import { describe, it, expect } from "vitest";
import { Money } from "../../src/domain/money.js";

describe("Money tests", () => {
  const money = (amount: bigint) => Money.fromMinorUnits(amount, "COP");

  it("should create a money instance", () => {
    const testMoney = Money.fromMinorUnits(1000n, "COP");
    expect(testMoney).toBeInstanceOf(Money);
  });

  it("should return the amount as a string", () => {
    const testMoney = Money.fromMinorUnits(2000n, "USD");
    const amount = testMoney.toMinorUnits();
    expect(amount).toBeTypeOf("string");
    expect(amount).toBe("2000");
  });

  it("should create a money with amount zero", () => {
    const testMoney = Money.zero("EUR");
    expect(testMoney.isZero()).toBe(true);
  });

  it("should create a money instance with the sum of many moneys", () => {
    const moneys = [
      Money.fromMinorUnits(1000n, "USD"),
      Money.fromMinorUnits(2000n, "USD"),
      Money.fromMinorUnits(3000n, "USD"),
      Money.fromMinorUnits(4000n, "USD"),
      Money.fromMinorUnits(5000n, "USD"),
      Money.fromMinorUnits(6000n, "USD"),
    ];
    const total = Money.sum(moneys, "USD");
    expect(total).toBeInstanceOf(Money);
    expect(total.equals(Money.fromMinorUnits(21000n, "USD"))).toBe(true);
  });

  it("should sum the list to zero", () => {
    const emptyMoney = Money.sum([], "USD");
    expect(emptyMoney).toEqual(Money.zero("USD"));
  });

  it("should add the amount to the money", () => {
    const testMoney = Money.fromMinorUnits(1000n, "COP");
    const additionMoney = testMoney.add(Money.fromMinorUnits(2000n, "COP"));
    expect(additionMoney.toMinorUnits()).toBe("3000");
  });

  it("should subtract the amount to the money", () => {
    const testMoney = Money.fromMinorUnits(2000n, "COP");
    const substractionMoney = testMoney.subtract(Money.fromMinorUnits(1000n, "COP"));
    expect(substractionMoney.toMinorUnits()).toBe("1000");
  });

  it("should subtract to a negative value", () => {
    const testMoney = Money.fromMinorUnits(1000n, "USD");
    const subtractionMoney = testMoney.subtract(Money.fromMinorUnits(3000n, "USD"));
    expect(subtractionMoney.toMinorUnits()).toBe("-2000");
  });

  it.each([
    [2000n, 2000n, true],
    [2000n, 3000n, false],
  ])("equals(%s, %s) should return %s", (amount1, amount2, expected) => {
    expect(money(amount1).equals(money(amount2))).toBe(expected);
  });

  it.each([
    [3000n, 1000n, true],
    [1000n, 3000n, false],
  ])("greaterThan(%s, %s) should return %s", (amount1, amount2, expected) => {
    expect(money(amount1).greaterThan(money(amount2))).toBe(expected);
  });

  it.each([
    [3000n, 1000n, true],
    [1000n, 1000n, true],
    [1000n, 3000n, false],
  ])("greaterThanOrEqual(%s, %s) should return %s", (amount1, amount2, expected) => {
    expect(money(amount1).greaterThanOrEqual(money(amount2))).toBe(expected);
  });

  it.each([
    [2000n, 3000n, true],
    [3000n, 2000n, false],
  ])("lessThan(%s, %s) should return %s", (amount1, amount2, expected) => {
    expect(money(amount1).lessThan(money(amount2))).toBe(expected);
  });

  it.each([
    [1000n, 3000n, true],
    [1000n, 1000n, true],
    [3000n, 1000n, false],
  ])("lessThanOrEqual(%s, %s) should return %s", (amount1, amount2, expected) => {
    expect(money(amount1).lessThanOrEqual(money(amount2))).toBe(expected);
  });

  it("should return the negation of the money", () => {
    const testMoney = Money.fromMinorUnits(1000n, "USD");
    const negativeMoney = testMoney.negate();
    expect(negativeMoney.toMinorUnits()).toBe("-1000");

    const testMoney1 = Money.fromMinorUnits(-1000n, "EUR");
    const negativeMoney1 = testMoney1.negate();
    expect(negativeMoney1.toMinorUnits()).toBe("1000");
  });

  it("should throw due to currency mismatch", () => {
    const testMoney = Money.fromMinorUnits(1000n, "USD");
    expect(() => testMoney.add(Money.fromMinorUnits(1000n, "EUR"))).toThrow(
      "Currency mismatch: USD vs EUR",
    );
  });
});
