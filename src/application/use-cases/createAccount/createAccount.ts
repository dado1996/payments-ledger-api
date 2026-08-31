import type { TransactionRepository } from "../../ports/transactionRepository.js";
import type { CreateAccountDTO } from "./createAccountDTO.js";
import { Account } from "../../../domain/account/account.js";
import { v7 as uuidv7 } from "uuid";

export class CreateAccount {
  public constructor(private readonly transactionRepo: TransactionRepository) {}

  public async execute(command: CreateAccountDTO) {
    const id = uuidv7();
    const account = Account.create(id, command.name, command.currency, new Date());
    await this.transactionRepo.saveAccount(account);
    return account;
  }
}
