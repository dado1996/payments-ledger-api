import type { AccountId } from "./ledger.js";
import type { Money } from "./money.js";

export enum ErrorCodes {
  UNBALANCED_TRANSACTION = "UNBALANCED_TRANSACTION",
  INVALID_ENTRY = "INVALID_ENTRY",
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
