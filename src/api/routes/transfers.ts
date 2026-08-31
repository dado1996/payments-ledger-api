import { z } from "zod";
import type { App, AppDependencies } from "../app.js";
import { CURRENCY } from "../../domain/money/money.js";

const TransferHeadersSchema = z.object({
  "idempotency-key": z.string().min(5),
});

const TransferBodySchema = z.object({
  sourceAccountId: z.uuidv7(),
  destinationAccountId: z.uuidv7(),
  currency: z.enum(CURRENCY),
  amount: z
    .string()
    .regex(/^\d+$/, "amount must be a positive integer string")
    .refine((v) => BigInt(v) > 0, "amount must be bigger than zero")
    .transform((v) => BigInt(v)),
});

const TransferParamsSchema = z.object({
  id: z.uuidv7(),
});

export function registerTransferRoutes(app: App, deps: AppDependencies) {
  app.post(
    "/transfers",
    { schema: { headers: TransferHeadersSchema, body: TransferBodySchema } },
    async (request, reply) => {
      const { sourceAccountId, destinationAccountId, amount, currency } = request.body;
      const idempotencyKey = request.headers["idempotency-key"];

      const transaction = await deps.createTransfer.execute({
        sourceAccountId,
        destinationAccountId,
        amount,
        currency,
        idempotencyKey,
      });

      const snapshot = transaction.toSnapshot();
      const response = {
        id: snapshot.id,
        idempotencyKey: snapshot.idempotencyKey,
        currency: snapshot.currency,
        createdAt: snapshot.createdAt,
        entries: [...snapshot.entries].map((entry) => ({
          accountId: entry.toSnapshot().accountId,
          amount: entry.toSnapshot().amount.toString(),
        })),
      };

      return reply.status(201).send(response);
    },
  );

  app.get(
    "/transfers/:id",
    {
      schema: { headers: TransferHeadersSchema, params: TransferParamsSchema },
    },
    async (request, reply) => {
      const { id } = request.params;

      const result = await deps.getTransfer.execute({ id });
      if (!result) {
        return reply.status(404).send({
          message: "Not Found",
        });
      }

      const response = {};

      return reply.status(200).send(response);
    },
  );
}
