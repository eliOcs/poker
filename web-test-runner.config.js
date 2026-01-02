export default {
  files: "test/frontend/**/*.test.js",
  nodeResolve: {
    exportConditions: ["production", "default"],
  },
  port: 8765,
};
