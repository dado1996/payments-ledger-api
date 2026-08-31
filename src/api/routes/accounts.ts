import { z } from "zod";
import type { App, AppDependencies } from "../app.js";
import { CURRENCY } from "../../domain/money/money.js";

const AccountParamsSchema = z.object({
  id: z.uuidv7(),
});

const AccountBodySchema = z.object({
  name: z.string().min(5).max(30),
  currency: z.enum(CURRENCY),
});

export function registerAccountRoutes(app: App, deps: AppDependencies) {
  app.get(
    "/accounts/:id",
    {
      schema: {
        params: AccountParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const accountResponse = await deps.getAccountBalance.execute({ id });

      if (!accountResponse) {
        return reply.status(404).send({
          message: "Not Found",
        });
      }

      const { account, balance } = accountResponse;
      const response = {
        id: account.toSnapshot().id,
        name: account.toSnapshot().name,
        balance: balance.toMinorUnits(),
      };

      return reply.status(200).send(response);
    },
  );

  app.get(
    "/accounts/:id/entries",
    {
      schema: {
        params: AccountParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const accountEntries = await deps.getAccountEntries.execute({ id });

      const response = accountEntries.map((entry) => ({
        id: entry.toSnapshot().id,
        amount: entry.toSnapshot().amount.toString(),
      }));

      return reply.status(200).send(response);
    },
  );

  app.post(
    "/accounts",
    {
      schema: {
        body: AccountBodySchema,
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
