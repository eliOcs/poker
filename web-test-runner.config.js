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
  browserStartTimeout: 10000,
  testsStartTimeout: 10000,
  testsFinishTimeout: 30000,
};
