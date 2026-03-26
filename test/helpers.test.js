const test = require("node:test");
const assert = require("node:assert/strict");

const { parseArgs } = require("../src/utils");
const {
  findDeepValue,
  normalizeVideoCreatePayload,
  normalizeVideoPublishPayload,
  normalizeStrategyPayload,
  normalizeTaskStatus,
  findEnabledState,
  findTaskId,
} = require("../src/core");

test("parseArgs collects flags and positionals", () => {
  const parsed = parseArgs([
    "video",
    "create",
    "--file",
    "payload.json",
    "--json",
    "--timeout",
    "5000",
  ]);

  assert.deepEqual(parsed.positionals, ["video", "create"]);
  assert.equal(parsed.flags.file, "payload.json");
  assert.equal(parsed.flags.json, true);
  assert.equal(parsed.flags.timeout, "5000");
});

test("normalizeVideoCreatePayload unwraps formData and request wrappers", () => {
  assert.deepEqual(
    normalizeVideoCreatePayload({ formData: { techType: "veo" } }),
    { techType: "veo" },
  );
  assert.deepEqual(
    normalizeVideoCreatePayload({ request: { techType: "sora" } }),
    { techType: "sora" },
  );
});

test("normalizeVideoPublishPayload maps accountId to businessId", () => {
  assert.deepEqual(
    normalizeVideoPublishPayload({ accountId: "acct_123", caption: "hello" }),
    { accountId: "acct_123", businessId: "acct_123", caption: "hello" },
  );
});

test("normalizeStrategyPayload unwraps strategyCreateDTO", () => {
  assert.deepEqual(
    normalizeStrategyPayload({ strategyCreateDTO: { name: "test" } }),
    { name: "test" },
  );
});

test("normalizeTaskStatus normalizes documented numeric states", () => {
  assert.equal(normalizeTaskStatus({ status: 0 }), "failed");
  assert.equal(normalizeTaskStatus({ status: 1 }), "completed");
  assert.equal(normalizeTaskStatus({ status: 2 }), "processing");
});

test("findEnabledState handles booleans, numbers, and strings", () => {
  assert.equal(findEnabledState({ enabled: true }), true);
  assert.equal(findEnabledState({ status: 0 }), false);
  assert.equal(findEnabledState({ status: "enabled" }), true);
});

test("findTaskId falls back to deep string extraction", () => {
  const taskId = findTaskId({
    data: {
      message: "created [123e4567-e89b-12d3-a456-426614174000]",
    },
  });

  assert.equal(taskId, "123e4567-e89b-12d3-a456-426614174000");
});

test("findDeepValue walks nested objects", () => {
  const value = findDeepValue({
    outer: {
      inner: {
        status: "completed",
      },
    },
  }, ["status"]);

  assert.equal(value, "completed");
});
