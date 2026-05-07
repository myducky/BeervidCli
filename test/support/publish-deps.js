function createPublishDeps(overrides = {}) {
  return {
    requireApiKey() {},
    async resolveCreatorUserOpenId() {
      throw new Error("resolveCreatorUserOpenId should not be called");
    },
    readJsonInput() {
      return {
        creatorUserOpenId: "__REPLACE_WITH_CREATOR_USER_OPEN_ID__",
        current: 1,
        size: 20,
      };
    },
    async apiRequest(_config, request) {
      return {
        data: {
          code: 0,
          message: "success",
          data: {
            products: [],
            total: 0,
          },
          request,
        },
      };
    },
    findRecords(data) {
      return data.data.products || data.data.records || [];
    },
    formatOutput(result) {
      return result;
    },
    handlePublishStrategy() {},
    buildSendRecordsRequest() {},
    buildStrategyListRequest() {
      return {};
    },
    runPublishWorkflow() {},
    normalizeStrategyPayload(value) {
      if (value && typeof value === "object" && !Array.isArray(value) && value.strategyCreateDTO) {
        return value.strategyCreateDTO;
      }
      return value;
    },
    findStrategyId() {
      return null;
    },
    toggleStrategy() {},
    findEnabledState() {
      return null;
    },
    formatEnabledState(value) {
      return value;
    },
    parsePositiveInteger(value, flagName, defaultValue) {
      const raw = value == null || value === "" ? defaultValue : value;
      const number = Number(raw);
      if (!Number.isInteger(number) || number <= 0) {
        const error = new Error(`${flagName} must be a positive integer.`);
        error.exitCode = 1;
        throw error;
      }
      return number;
    },
    findName() {
      return null;
    },
    fail(message, exitCode = 1) {
      const error = new Error(message);
      error.exitCode = exitCode;
      throw error;
    },
    printSubcommandHelp() {},
    ...overrides,
  };
}

module.exports = {
  createPublishDeps,
};
