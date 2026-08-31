import type { App, AppDependencies } from "../app.js";

export function registerSystemRoutes(app: App, deps: AppDependencies) {
  app.get("/reconciliation", {}, async (_request, reply) => {
    const systemBalance = await deps.getSystemBalance.execute();
    const response = systemBalance.map((item) => {
      return {
        currency: item.getCurrency(),
        balance: item.toMinorUnits(),
      };
    });

    return reply.status(200).send(response);
  });
}
