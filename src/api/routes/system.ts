import type { App, AppDependencies } from "../app.js";

export function registerSystemRoutes(app: App, deps: AppDependencies) {
  app.get("/reconciliation", {}, async (_request, reply) => {
    const response = await deps.getSystemBalance.execute();

    return reply.status(200).send(response);
  });
}
