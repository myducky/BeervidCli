const test = require("node:test");
const assert = require("node:assert/strict");

const { handlePublish, handlePublishStrategy } = require("../../src/commands/publish");
const { createPublishDeps } = require("../support/publish-deps");

test("publish products accepts --file body without resolving account context", async () => {
  const calls = [];
  const outputs = [];
  const deps = createPublishDeps({
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

test("publish strategy create unwraps strategyCreateDTO before sending", async () => {
  const calls = [];
  const outputs = [];
  const deps = createPublishDeps({
    readJsonInput() {
      return {
        strategyCreateDTO: {
          name: "Summer Drop",
        },
      };
    },
    async apiRequest(_config, request) {
      calls.push(request);
      return {
        data: {
          data: {
            id: "strategy_123",
            name: "Summer Drop",
          },
        },
      };
    },
    findStrategyId() {
      return "strategy_123";
    },
    findName() {
      return "Summer Drop";
    },
    formatOutput(result) {
      outputs.push(result);
    },
  });

  await handlePublishStrategy("create", { file: "strategy.json" }, { apiKey: "test-key" }, deps);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    method: "POST",
    path: "/strategies/create",
    body: {
      name: "Summer Drop",
    },
  });
  assert.equal(outputs[0].command, "publish.strategy.create");
  assert.match(outputs[0].textLines.join("\n"), /strategy_123/);
});

test("publish strategy enable calls toggleStrategy with enabled state", async () => {
  const outputs = [];
  const deps = createPublishDeps({
    async toggleStrategy(_config, id, enabled) {
      assert.equal(id, "strategy_123");
      assert.equal(enabled, true);
      return {
        data: {
          enabled: true,
        },
      };
    },
    findEnabledState(data) {
      return data.enabled;
    },
    formatEnabledState(value) {
      return value ? "enabled" : "disabled";
    },
    formatOutput(result) {
      outputs.push(result);
    },
  });

  await handlePublishStrategy("enable", { id: "strategy_123" }, { apiKey: "test-key" }, deps);

  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].command, "publish.strategy.enable");
  assert.match(outputs[0].textLines.join("\n"), /enabled/);
});
