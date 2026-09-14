import { z } from "zod";
import type { App, AppDependencies } from "../app.js";
import { CURRENCY } from "../../domain/money/money.js";

const AccountParamsSchema = z.object({
  id: z.uuid(),
});

const AccountBodySchema = z.object({
  name: z.string().min(5).max(30),
  currency: z.enum(CURRENCY),
});

const AccountResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  currency: z.enum(CURRENCY),
  balance: z.string(),
  createdAt: z.date(),
});

const AccountEntriesResponseSchema = z.object({
  entries: z.array(
    z.object({
      accountId: z.uuid(),
      amount: z.string(),
    }),
  ),
});

const AccountEntriesNotFoundSchema = z.object({
  message: z.string(),
});

const AccountCreateResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  currency: z.enum(CURRENCY),
  createdAt: z.date(),
});

const AccountResponseErrorSchema = z.object({
  message: z.literal("Not Found"),
});

export function registerAccountRoutes(app: App, deps: AppDependencies) {
  app.get(
    "/accounts/:id",
    {
      schema: {
        tags: ["accounts"],
        summary: "Search for the account by id",
        description: "Find the account in the database using the unique id as reference",
        params: AccountParamsSchema,
        response: {
          200: AccountResponseSchema,
          404: AccountResponseErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const accountResponse = await deps.getAccount.execute({ id });

      if (!accountResponse) {
        return reply.status(404).send({
          message: "Not Found",
        });
      }

      const { account, balance } = accountResponse;
      const snapshot = account.toSnapshot();
      const response = {
        id: snapshot.id,
        name: snapshot.name,
        currency: balance.getCurrency(),
        balance: balance.toMinorUnits(),
        createdAt: snapshot.createdAt,
      };

      return reply.status(200).send(response);
    },
  );

  app.get(
    "/accounts/:id/entries",
    {
      schema: {
        tags: ["accounts"],
        summary: "Search the entries of an account",
        description: "Filters the entries stored in the database using the account id",
        params: AccountParamsSchema,
        response: {
          200: AccountEntriesResponseSchema,
          404: AccountEntriesNotFoundSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const accountEntries = await deps.getAccountEntries.execute({ id });
      return reply.status(200).send({ entries: accountEntries });
    },
  );

  app.post(
    "/accounts",
    {
      schema: {
        tags: ["accounts"],
        summary: "Creates an account",
        description:
          "Creates a new account with the information provided in the body of the request. It fails if the data provided is incomplete",
        body: AccountBodySchema,
        response: {
          201: AccountCreateResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, currency } = request.body;
      const account = await deps.createAccount.execute({ name, currency });

      const snapshot = account.toSnapshot();

      const response = {
        id: snapshot.id,
        name: snapshot.name,
        currency: snapshot.currency,
        createdAt: snapshot.createdAt,
      };

      return reply.status(201).send(response);
    },
  );
}
