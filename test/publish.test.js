const test = require("node:test");
const assert = require("node:assert/strict");

const { handlePublish } = require("../src/commands/publish");

function createDeps(overrides = {}) {
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
      return data.data.products;
    },
    formatOutput(result) {
      return result;
    },
    handlePublishStrategy() {},
    buildSendRecordsRequest() {},
    runPublishWorkflow() {},
    normalizeStrategyPayload(value) {
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
    printSubcommandHelp() {},
    ...overrides,
  };
}

test("publish products accepts --file body without resolving account context", async () => {
  const calls = [];
  const outputs = [];
  const deps = createDeps({
    async apiRequest(_config, request) {
      calls.push(request);
      return {
        data: {
          code: 0,
          message: "success",
          data: {
            products: [],
            total: 0,
          },
        },
      };
    },
    formatOutput(result) {
      outputs.push(result);
    },
  });

  await handlePublish(
    "products",
    [],
    { file: "examples/publish-products.json" },
    { apiKey: "test-key" },
    deps,
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    method: "POST",
    path: "/shop-products/list",
    body: {
      creatorUserOpenId: "__REPLACE_WITH_CREATOR_USER_OPEN_ID__",
      current: 1,
      size: 20,
    },
  });
  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].command, "publish.products");
});
