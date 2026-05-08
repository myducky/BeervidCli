const test = require("node:test");
const assert = require("node:assert/strict");

const { handlePublish, handlePublishStrategy } = require("../../src/commands/publish");
const { resolveCreatorUserOpenId } = require("../../src/cli");
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

test("publish products accepts a single creator user open id positional and fetches all pages by default", async () => {
  const calls = [];
  const outputs = [];
  const deps = createPublishDeps({
    async resolveCreatorUserOpenId() {
      return "creator_open_1";
    },
    async apiRequest(_config, request) {
      calls.push(request);
      if (request.body.current === 1) {
        return {
          data: {
            data: {
              products: [{ id: "product_1", title: "Seat Cover" }],
              total: 2,
            },
          },
        };
      }
      return {
        data: {
          data: {
            products: [{ id: "product_2", title: "Cargo Mat" }],
            total: 2,
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
    ["creator_open_1"],
    {},
    { apiKey: "test-key" },
    deps,
  );

  assert.deepEqual(calls.map((call) => call.body), [
    { current: 1, size: 100, creatorUserOpenId: "creator_open_1" },
    { current: 2, size: 100, creatorUserOpenId: "creator_open_1" },
  ]);
  assert.equal(outputs[0].data.data.products.length, 2);
  assert.match(outputs[0].textLines.join("\n"), /2 products found/);
});

test("publish products requires account context when not using a file body", async () => {
  const deps = createPublishDeps();

  await assert.rejects(
    () => handlePublish(
      "products",
      [],
      { current: "2", size: "20" },
      { apiKey: "test-key" },
      deps,
    ),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /<id>/);
      return true;
    },
  );
});

test("publish products resolves account id to creatorUserOpenId for product query", async () => {
  const calls = [];
  const outputs = [];
  const deps = createPublishDeps({
    async resolveCreatorUserOpenId(_config, flags) {
      assert.equal(flags["account-id"], "biz_123");
      return "creator_open_1";
    },
    async apiRequest(_config, request) {
      calls.push(request);
      return {
        data: {
          code: 0,
          message: "success",
          data: {
            products: [{ id: "product_1", title: "Seat Cover" }],
            total: 1,
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
    { "account-id": "biz_123", current: "2", size: "20" },
    { apiKey: "test-key" },
    deps,
  );

  assert.deepEqual(calls[0], {
    method: "POST",
    path: "/shop-products/list",
    body: {
      current: 2,
      size: 20,
      creatorUserOpenId: "creator_open_1",
    },
  });
  assert.match(outputs[0].textLines.join("\n"), /1 products found/);
});

test("resolveCreatorUserOpenId scans account pages until it finds account id", async () => {
  const calls = [];
  const creatorUserOpenId = await resolveCreatorUserOpenId(
    { apiKey: "test-key" },
    { "account-id": "biz_2", size: "20" },
    {
      async apiRequest(_config, request) {
        calls.push(request);
        if (request.query.current === 1) {
          return {
            data: {
              data: {
                records: [{ businessId: "biz_1", creatorUserOpenId: "creator_open_1" }],
                pages: 2,
              },
            },
          };
        }
        return {
          data: {
            data: {
              records: [{ businessId: "biz_2", creatorUserOpenId: "creator_open_2" }],
              pages: 2,
            },
          },
        };
      },
    },
  );

  assert.equal(creatorUserOpenId, "creator_open_2");
  assert.deepEqual(calls.map((call) => call.query), [
    { current: 1, size: 100, shoppableType: "ALL" },
    { current: 2, size: 100, shoppableType: "ALL" },
  ]);
});

test("publish products includes creatorUserOpenId only when explicitly provided", async () => {
  const calls = [];
  const deps = createPublishDeps({
    async apiRequest(_config, request) {
      calls.push(request);
      return {
        data: {
          code: 0,
          message: "success",
          data: {
            products: [],
          },
        },
      };
    },
  });

  await handlePublish(
    "products",
    [],
    { "creator-user-open-id": "creator_open_1" },
    { apiKey: "test-key" },
    deps,
  );

  assert.deepEqual(calls[0].body, {
    current: 1,
    size: 100,
    creatorUserOpenId: "creator_open_1",
  });
});

test("publish products validates pagination flags", async () => {
  const deps = createPublishDeps({
    async resolveCreatorUserOpenId() {
      return "creator_123";
    },
  });

  await assert.rejects(
    () => handlePublish(
      "products",
      [],
      { current: "abc" },
      { apiKey: "test-key" },
      deps,
    ),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--current must be a positive integer/);
      return true;
    },
  );
});

test("publish products explains how to find creatorUserOpenId when no products are found", async () => {
  const outputs = [];
  const deps = createPublishDeps({
    async resolveCreatorUserOpenId() {
      return "creator_open_1";
    },
    formatOutput(result) {
      outputs.push(result);
    },
  });

  await handlePublish(
    "products",
    [],
    { "creator-user-open-id": "creator_open_1" },
    { apiKey: "test-key" },
    deps,
  );

  const text = outputs[0].textLines.join("\n");
  assert.match(text, /0 products found for creator creator_open_1/);
  assert.match(text, /beervid accounts shoppable --json/);
  assert.match(text, /creatorUserOpenId/);
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
