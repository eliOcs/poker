import fs from "node:fs";
import path from "node:path";

const FRONTEND_ROOT = path.resolve("src/frontend");
const TOP_LEVEL_ASSET = /^\/[^/]+\.[a-z0-9]+$/i;
const FONT_ASSET = /^\/fonts\/[^/]+\.[a-z0-9]+$/i;

export default {
  files: "test/frontend/**/*.test.js",
  nodeResolve: {
    exportConditions: ["production", "default"],
  },
  middleware: [
    async (ctx, next) => {
      if (TOP_LEVEL_ASSET.test(ctx.path)) {
        const fileName = ctx.path.slice(1);
        if (fs.existsSync(path.join(FRONTEND_ROOT, fileName))) {
          ctx.url = `/src/frontend/${fileName}`;
        }
      } else if (FONT_ASSET.test(ctx.path)) {
        const fileName = ctx.path.slice("/fonts/".length);
        if (fs.existsSync(path.join(FRONTEND_ROOT, "fonts", fileName))) {
          ctx.url = `/src/frontend/fonts/${fileName}`;
        }
      }
      await next();
    },
  ],
  port: 8765,
  testFramework: {
    config: {
      timeout: 5000,
    },
  },
  browserStartTimeout: 30000,
  testsStartTimeout: 30000,
  testsFinishTimeout: 30000,
  coverageConfig: {
    report: true,
    reportDir: "coverage/frontend",
    reporters: ["text", "html", "json-summary"],
  },
};
