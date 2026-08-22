import type { Currency, Money } from "./money/money.js";
import type { AccountId } from "./shared/shared.js";

export enum ErrorCodes {
  UNBALANCED_TRANSACTION = "UNBALANCED_TRANSACTION",
  INVALID_ENTRY = "INVALID_ENTRY",
  DUPLICATE_TRANSFER = "DUPLICATE_TRANSFER",
  ACCOUNT_NOT_FOUND = "ACCOUNT_NOT_FOUND",
  CURRENCY_MISMATCH = "CURRENCY_MISMATCH",
}

export abstract class DomainError extends Error {
  public readonly code: ErrorCodes;

  constructor(message: string, code: ErrorCodes) {
    super(message);
    this.code = code;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnbalancedTransactionError extends DomainError {
  public readonly delta: Money | undefined;
  constructor(message: string, money?: Money) {
    super(message, ErrorCodes.UNBALANCED_TRANSACTION);
    this.delta = money;
  }
}

export class InvalidEntryError extends DomainError {
  public readonly accountId: AccountId | undefined;
  constructor(message: string, accountId?: AccountId) {
    super(message, ErrorCodes.INVALID_ENTRY);
    this.accountId = accountId;
  }
}

export class IdempotencyConflictError extends DomainError {
  public readonly idempotencyKey: string;
  constructor(message: string, idempotencyKey: string) {
    super(message, ErrorCodes.DUPLICATE_TRANSFER);
    this.idempotencyKey = idempotencyKey;
  }
}

export class AccountNotFoundError extends DomainError {
  public readonly id: string | undefined;
  constructor(message: string, id?: string) {
    super(message, ErrorCodes.ACCOUNT_NOT_FOUND);
    this.id = id;
  }
}

export class CurrencyMismatchError extends DomainError {
  public readonly currency: Currency | undefined;
  constructor(message: string, currency?: Currency) {
    super(message, ErrorCodes.CURRENCY_MISMATCH);
    this.currency = currency;
  }
}
