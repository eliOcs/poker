/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  extends: "dependency-cruiser/configs/recommended",

  forbidden: [
    // Override recommended not-to-unresolvable to exclude absolute URL imports.
    // Both frontend and ui-catalog files import modules via absolute HTTP paths
    // (e.g. /src/shared/stakes.js, /src/frontend/index.js, /fixtures.js)
    // which are served correctly at runtime but appear unresolvable to static analysis.
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: {
        couldNotResolve: true,
        pathNot: "^/",
      },
    },

    // Override recommended no-circular to exclude test files.
    // Circular dependencies in visual test helpers are low risk; enforce only in src/.
    {
      name: "no-circular",
      severity: "error",
      from: { pathNot: "^test/" },
      to: { circular: true },
    },

    // Override the recommended no-orphans rule to add project-specific exclusions.
    // Same name → replaces the recommended version entirely.
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Orphan modules are likely dead code.",
      from: {
        orphan: true,
        pathNot: [
          "^src/backend/index\\.js$", // server entry point (nothing imports it)
          "^src/frontend/app\\.js$", // browser entry point (nothing imports it)
          "^src/backend/poker/types\\.js$", // JSDoc-only type definitions
          "^test/", // test runner is the implicit importer
        ],
      },
      to: {},
    },

    // Prevent frontend from importing backend code.
    // src/shared/ is explicitly allowed — that's what it's there for.
    {
      name: "frontend-not-import-backend",
      severity: "error",
      comment:
        "Frontend must not import backend code. Use src/shared/ for shared logic.",
      from: { path: "^src/frontend/" },
      to: { path: "^src/backend/" },
    },
  ],

  options: {
    moduleSystems: ["es6"],
    doNotFollow: { path: "node_modules" },
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/[^/]+",
        theme: {
          graph: { rankdir: "LR", splines: "ortho" },
          modules: [
            {
              criteria: { source: "^src/backend/" },
              attributes: { fillcolor: "#dce8f7" },
            },
            {
              criteria: { source: "^src/frontend/" },
              attributes: { fillcolor: "#d4edda" },
            },
            {
              criteria: { source: "^src/shared/" },
              attributes: { fillcolor: "#fff3cd" },
            },
          ],
        },
      },
    },
  },
};
