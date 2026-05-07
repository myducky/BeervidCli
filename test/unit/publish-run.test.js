const test = require("node:test");
const assert = require("node:assert/strict");

const { runPublishWorkflow } = require("../../src/workflows/publish-run");

test("runPublishWorkflow enables the created strategy explicitly", async () => {
  const toggles = [];
  const result = await runPublishWorkflow({
    config: { apiKey: "test-key" },
    body: { name: "Strategy" },
    apiRequest: async () => ({ data: { data: { id: "strategy_123" } } }),
    normalizeStrategyPayload: (body) => body,
    findStrategyId: () => "strategy_123",
    toggleStrategy: async (_config, id, enabled) => {
      toggles.push({ id, enabled });
      return { data: { enabled: true } };
    },
    findEnabledState: (data) => data.enabled,
    formatEnabledState: (value) => (value ? "enabled" : "disabled"),
  });

  assert.deepEqual(toggles, [{ id: "strategy_123", enabled: true }]);
  assert.equal(result.summary.status, "enabled");
});
