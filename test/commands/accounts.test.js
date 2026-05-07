const test = require("node:test");
const assert = require("node:assert/strict");

const { handleAccounts } = require("../../src/commands/accounts");
const { collectOutput } = require("../support/command-output");

function createAccountsDeps(overrides = {}) {
  return {
    requireApiKey() {},
    copyOptionalFlag(flags, target, key) {
      if (flags[key] != null) target[key] = flags[key];
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
    async apiRequest() {
      throw new Error("apiRequest should be stubbed in this test");
    },
    findRecords(data) {
      return data.data.records;
    },
    printSubcommandHelp() {},
    fail(message, exitCode = 1) {
      const error = new Error(message);
      error.exitCode = exitCode;
      throw error;
    },
    ...collectOutput(),
    ...overrides,
  };
}

test("accounts list forwards optional filters and defaults shoppableType to ALL", async () => {
  const requests = [];
  const deps = createAccountsDeps({
    async apiRequest(_config, request) {
      requests.push(request);
      return {
        data: {
          data: {
            records: [],
          },
        },
      };
    },
  });

  await handleAccounts("list", { current: "2", size: "5", keyword: "shop" }, { apiKey: "test-key" }, deps);

  assert.deepEqual(requests, [
    {
      method: "GET",
      path: "/tt-accounts",
      query: {
        current: 2,
        size: 5,
        keyword: "shop",
        shoppableType: "ALL",
      },
    },
  ]);
  assert.equal(deps.calls[0].command, "accounts.list");
});

test("accounts shoppable hard-codes TTS query mode", async () => {
  const requests = [];
  const deps = createAccountsDeps({
    async apiRequest(_config, request) {
      requests.push(request);
      return {
        data: {
          data: {
            records: [{ id: "acct_1", displayName: "Shop One" }],
          },
        },
      };
    },
  });

  await handleAccounts("shoppable", { keyword: "shop" }, { apiKey: "test-key" }, deps);

  assert.deepEqual(requests, [
    {
      method: "GET",
      path: "/tt-accounts",
      query: {
        current: 1,
        size: 50,
        keyword: "shop",
        shoppableType: "TTS",
      },
    },
  ]);
  assert.equal(deps.calls[0].command, "accounts.shoppable");
  assert.match(deps.calls[0].textLines.join("\n"), /1 shoppable account found/);
});

test("accounts list rejects invalid pagination flags", async () => {
  const deps = createAccountsDeps();

  await assert.rejects(
    () => handleAccounts("list", { current: "bad" }, { apiKey: "test-key" }, deps),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--current must be a positive integer/);
      return true;
    },
  );
});

test("accounts shoppable rejects invalid pagination flags", async () => {
  const deps = createAccountsDeps();

  await assert.rejects(
    () => handleAccounts("shoppable", { size: "bad" }, { apiKey: "test-key" }, deps),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--size must be a positive integer/);
      return true;
    },
  );
});

test("accounts list rejects invalid shoppable type", async () => {
  const deps = createAccountsDeps();

  await assert.rejects(
    () => handleAccounts("list", { "shoppable-type": "BAD" }, { apiKey: "test-key" }, deps),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--shoppable-type must be one of/);
      return true;
    },
  );
});
