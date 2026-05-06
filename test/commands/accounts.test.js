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
    async apiRequest() {
      throw new Error("apiRequest should be stubbed in this test");
    },
    findRecords(data) {
      return data.data.records;
    },
    printSubcommandHelp() {},
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
        current: "2",
        size: "5",
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
