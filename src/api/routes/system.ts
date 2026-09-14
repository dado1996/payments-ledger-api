import { z } from "zod";
import type { App, AppDependencies } from "../app.js";
import { CURRENCY } from "../../domain/money/money.js";

const SystemResponseSchema = z.object({
  balances: z.array(
    z.object({
      currency: z.enum(CURRENCY),
      balance: z.string(),
    }),
  ),
  isBalanced: z.boolean(),
});

export function registerSystemRoutes(app: App, deps: AppDependencies) {
  app.get(
    "/reconciliation",
    {
      schema: {
        tags: ["reconciliation"],
        summary: "Returns the state of the system",
        description:
          "Returns the entries associated with the balance of the system to ensure correctness",
        response: {
          200: SystemResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const response = await deps.getSystemBalance.execute();

      return reply.status(200).send(response);
    },
  );
}
