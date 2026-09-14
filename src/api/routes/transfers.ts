import { z } from "zod";
import type { App, AppDependencies } from "../app.js";
import { CURRENCY } from "../../domain/money/money.js";
import { toTransferResponse } from "./route.js";

const TransferHeadersSchema = z.object({
  "idempotency-key": z.string().min(5),
});

const TransferResponseSchema = z.object({
  id: z.uuid(),
  idempotencyKey: z.string(),
  currency: z.enum(CURRENCY),
  createdAt: z.date(),
  entries: z.array(
    z.object({
      accountId: z.uuid(),
      amount: z.string(),
    }),
  ),
});

const TransferErrorResponseSchema = z.object({
  message: z.literal("Not Found"),
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
  id: z.uuid(),
});

export function registerTransferRoutes(app: App, deps: AppDependencies) {
  app.post(
    "/transfers",
    {
      schema: {
        headers: TransferHeadersSchema,
        body: TransferBodySchema,
        tags: ["transfers"],
        summary: "Create a transfer",
        description: "Creates an idempotent double-entry transfer between two ledger accounts.",
        response: {
          201: TransferResponseSchema,
        },
      },
    },
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

      const response = toTransferResponse(transaction);

      return reply.status(201).send(response);
    },
  );

  app.get(
    "/transfers/:id",
    {
      schema: {
        tags: ["transfers"],
        summary: "Searches for a transfer by id",
        description:
          "Finds the transfer associated by the id. If it doesn't exist or the id is invalid, returns 404",
        params: TransferParamsSchema,
        response: {
          200: TransferResponseSchema,
          404: TransferErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const result = await deps.getTransfer.execute({ id });
      if (!result) {
        return reply.status(404).send({
          message: "Not Found",
        });
      }

      const response = toTransferResponse(result);

      return reply.status(200).send(response);
    },
  );
}
