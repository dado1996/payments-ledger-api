import { describe, expect, it } from "vitest";
import {
  ErrorCodes,
  DomainError,
  InvalidEntryError,
  UnbalancedTransactionError,
} from "../../src/domain/errors.js";
import type { AccountId } from "../../src/domain/ledger.js";
import { Money } from "../../src/domain/money.js";

class TestDomainError extends DomainError {
  constructor(message: string, code: ErrorCodes) {
    super(message, code);
  }
}

describe("Domain errors", () => {
  it("should initialize a domain error with the provided message, code, and name", () => {
    const error = new TestDomainError("boom", ErrorCodes.INVALID_ENTRY);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(TestDomainError);
    expect(error.message).toBe("boom");
    expect(error.code).toBe(ErrorCodes.INVALID_ENTRY);
    expect(error.name).toBe("TestDomainError");
  });

  it("should store the delta when an unbalanced transaction error is created", () => {
    const delta = Money.fromMinorUnits(2500n, "USD");
    const error = new UnbalancedTransactionError("Entries are unbalanced", delta);

    expect(error).toBeInstanceOf(UnbalancedTransactionError);
    expect(error.code).toBe(ErrorCodes.UNBALANCED_TRANSACTION);
    expect(error.message).toBe("Entries are unbalanced");
    expect(error.delta).toEqual(delta);
  });

  it("should allow an unbalanced transaction error without a delta", () => {
    const error = new UnbalancedTransactionError("Less than 2 entries");

    expect(error.delta).toBeUndefined();
  });

  it("should store the account id when an invalid entry error is created", () => {
    const accountId: AccountId = "acc_123";
    const error = new InvalidEntryError("Invalid account", accountId);

    expect(error).toBeInstanceOf(InvalidEntryError);
    expect(error.code).toBe(ErrorCodes.INVALID_ENTRY);
    expect(error.message).toBe("Invalid account");
    expect(error.accountId).toBe(accountId);
  });

  it("should allow an invalid entry error without an account id", () => {
    const error = new InvalidEntryError("Entry amount must be non-zero");

    expect(error.accountId).toBeUndefined();
  });
});
