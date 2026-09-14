import Fastify from "fastify";
import { DomainError, ErrorCodes } from "../domain/errors.js";
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerTransferRoutes } from "./routes/transfers.js";
import type { GetAccount } from "../application/use-cases/getAccount/getAccount.js";
import type { GetTransfer } from "../application/use-cases/getTransfer/getTransfer.js";
import type { GetAccountEntries } from "../application/use-cases/getAccountEntries/getAccountEntries.js";
import type { CreateTransfer } from "../application/use-cases/createTransfer/createTransfer.js";
import type { GetSystemBalance } from "../application/use-cases/getSystemBalance/getSystemBalance.js";
import type { CreateAccount } from "../application/use-cases/createAccount/createAccount.js";
import { registerAccountRoutes } from "./routes/accounts.js";
import { registerSystemRoutes } from "./routes/system.js";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { z } from "zod";

export interface AppDependencies {
  logger?: boolean;
  createTransfer: CreateTransfer;
  getAccount: GetAccount;
  getTransfer: GetTransfer;
  getAccountEntries: GetAccountEntries;
  getSystemBalance: GetSystemBalance;
  createAccount: CreateAccount;
}

const HealthResponseSchema = z.object({
  status: z.literal("ok"),
});

export function buildApp(deps: AppDependencies) {
  const app = Fastify({
    logger: deps.logger ?? true,
    forceCloseConnections: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Payments Ledger API",
        description:
          "A double-entry payments ledger with idempotent transfers and per-currency reconciliation.",
        version: "1.0.0",
      },
      tags: [
        {
          name: "health",
          description: "Service health",
        },
        {
          name: "accounts",
          description: "Ledger accounts",
        },
        {
          name: "transfers",
          description: "Money transfers",
        },
        {
          name: "reconciliation",
          description: "Ledger reconciliation",
        },
      ],
    },
    transform: jsonSchemaTransform,
  });

  app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
  });

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

  app.register((instance) => {
    instance.get(
      "/health",
      {
        schema: {
          tags: ["health"],
          summary: "Checks status of the API",
          description: "Returns ok if the service is up and running",
          response: {
            200: HealthResponseSchema,
          },
        },
      },
      (_request, reply) => {
        return reply.send({ status: "ok" });
      },
    );

    registerTransferRoutes(instance, deps);
    registerAccountRoutes(instance, deps);
    registerSystemRoutes(instance, deps);
  });

  return app;
}

export type App = ReturnType<typeof buildApp>;
