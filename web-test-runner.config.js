const jsonReporters = process.env.COVERAGE_JSON === "true";

export default {
  files: "test/frontend/**/*.test.js",
  nodeResolve: {
    exportConditions: ["production", "default"],
  },
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
    reporters: jsonReporters ? ["json", "json-summary"] : ["lcov", "text"],
  },
};
