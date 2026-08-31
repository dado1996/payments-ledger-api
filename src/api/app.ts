import Fastify from "fastify";
import { DomainError, ErrorCodes } from "../domain/errors.js";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerTransferRoutes } from "./routes/transfers.js";
import type { GetAccountBalance } from "../application/use-cases/getAccountBalance/getAccountBalance.js";
import type { GetTransfer } from "../application/use-cases/getTransfer/getTransfer.js";
import type { GetAccountEntries } from "../application/use-cases/getAccountEntries/getAccountEntries.js";
import type { CreateTransfer } from "../application/use-cases/createTransfer/createTransfer.js";
import type { GetSystemBalance } from "../application/use-cases/getSystemBalance/getSystemBalance.js";
import type { CreateAccount } from "../application/use-cases/createAccount/createAccount.js";
import { registerAccountRoutes } from "./routes/accounts.js";

export interface AppDependencies {
  logger?: boolean;
  createTransfer: CreateTransfer;
  getAccountBalance: GetAccountBalance;
  getTransfer: GetTransfer;
  getAccountEntries: GetAccountEntries;
  getSystemBalance: GetSystemBalance;
  createAccount: CreateAccount;
}

export function buildApp(deps: AppDependencies) {
  const app = Fastify({
    logger: deps.logger ?? true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        code: "VALIDATION_ERROR",
        message: error.message,
      });
    }

    if (error instanceof DomainError) {
      const response = {
        code: error.code,
        message: error.message,
      };
      switch (error.code) {
        case ErrorCodes.ACCOUNT_NOT_FOUND:
          return reply.status(404).send(response);

        case ErrorCodes.CURRENCY_MISMATCH:
          return reply.status(422).send(response);

        case ErrorCodes.DUPLICATE_TRANSFER:
          return reply.status(409).send(response);

        default:
          return reply.status(400).send(response);
      }
    }

    reply.status(500).send({
      code: "INTERNAL_ERROR",
      message: "An unexpected error has occurred",
    });
  });

  app.get("/health", (_request, reply) => {
    return reply.send({ status: "ok" });
  });

  registerTransferRoutes(app, deps);
  registerAccountRoutes(app, deps);

  return app;
}

export type App = ReturnType<typeof buildApp>;
