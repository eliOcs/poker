import { parseBody } from "./http-route-utils.js";
import { createLearnScenario, evaluateLearnStrategy } from "./learn.js";

/** @returns {import('./http-routes.js').Route[]} */
export function createLearnRoutes() {
  return [
    {
      method: "GET",
      path: "/api/learn/scenario",
      handler: ({ res }) => {
        res.writeHead(200, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        res.end(JSON.stringify(createLearnScenario()));
      },
    },
    {
      method: "POST",
      path: "/api/learn/evaluate",
      handler: async ({ req, res }) => {
        const result = evaluateLearnStrategy(await parseBody(req));
        res.writeHead(200, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        res.end(JSON.stringify(result));
      },
    },
  ];
}
