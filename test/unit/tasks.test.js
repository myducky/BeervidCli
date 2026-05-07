const test = require("node:test");
const assert = require("node:assert/strict");

const { watchTask } = require("../../src/tasks");

test("watchTask rejects invalid interval flags", async () => {
  await assert.rejects(
    () => watchTask({
      config: { pollInterval: 5 },
      taskId: "task_123",
      flags: { interval: "abc" },
      getTask: async () => ({ status: "processing" }),
      sleep: async () => {},
    }),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--interval must be a positive number/);
      return true;
    },
  );
});

test("watchTask times out after max attempts", async () => {
  let calls = 0;

  await assert.rejects(
    () => watchTask({
      config: { pollInterval: 5 },
      taskId: "task_123",
      flags: { "max-attempts": "2", quiet: true },
      getTask: async () => {
        calls += 1;
        return { status: "processing" };
      },
      sleep: async () => {},
    }),
    (error) => {
      assert.equal(error.exitCode, 6);
      assert.match(error.message, /Task timed out/);
      return true;
    },
  );

  assert.equal(calls, 2);
});

test("getTask validates pagination flags before querying tasks", async () => {
  const { getTask } = require("../../src/tasks");

  await assert.rejects(
    () => getTask({
      config: {},
      taskId: "task_123",
      flags: { current: "bad" },
      apiRequest: async () => {
        throw new Error("apiRequest should not be called");
      },
      findRecords: () => [],
      copyOptionalFlag(flags, target, key) {
        if (flags[key] != null) target[key] = flags[key];
      },
    }),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--current must be a positive integer/);
      return true;
    },
  );
});
