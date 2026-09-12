import { buildApp } from "./api/app.js";
import { CreateAccount } from "./application/use-cases/createAccount/createAccount.js";
import { CreateTransfer } from "./application/use-cases/createTransfer/createTransfer.js";
import { GetAccount } from "./application/use-cases/getAccount/getAccount.js";
import { GetAccountEntries } from "./application/use-cases/getAccountEntries/getAccountEntries.js";
import { GetSystemBalance } from "./application/use-cases/getSystemBalance/getSystemBalance.js";
import { GetTransfer } from "./application/use-cases/getTransfer/getTransfer.js";
import { config } from "./infra/config/index.js";
import { closeConnection, db } from "./infra/db/client.js";
import { DrizzleTransactionRepository } from "./infra/persistence/drizzle/drizzleTransactionRepository.js";

const repo = new DrizzleTransactionRepository(db);

const createTransfer = new CreateTransfer(repo);
const createAccount = new CreateAccount(repo);
const getAccount = new GetAccount(repo);
const getAccountEntries = new GetAccountEntries(repo);
const getSystemBalance = new GetSystemBalance(repo);
const getTransfer = new GetTransfer(repo);

const app = buildApp({
  logger: true,
  createTransfer,
  createAccount,
  getAccount,
  getAccountEntries,
  getSystemBalance,
  getTransfer,
});

try {
  await app.listen({ port: config.PORT, host: config.HOST });
} catch (error: unknown) {
  app.log.error(error);
  process.exit(1);
}

async function shutdown() {
  console.log("SIGINT received, shutting down..."); // does this even print?
  try {
    console.log("closing app...");
    await app.close();
    console.log("app closed, closing db...");
    await closeConnection();
    console.log("db closed, exiting");
    process.exit(0);
  } catch (err) {
    console.error("shutdown error:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
