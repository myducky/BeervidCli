const test = require("node:test");
const assert = require("node:assert/strict");

const { handleAuth } = require("../../src/commands/auth");
const { collectOutput } = require("../support/command-output");

function createAuthDeps(overrides = {}) {
  return {
    fail(message, exitCode = 1) {
      const error = new Error(message);
      error.exitCode = exitCode;
      throw error;
    },
    saveApiKey() {},
    getConfigPath() {
      return "/tmp/beervid-config.json";
    },
    maskApiKey(apiKey) {
      return `masked:${apiKey}`;
    },
    requireApiKey() {},
    async apiRequest() {
      throw new Error("apiRequest should be stubbed in this test");
    },
    findDeepValue() {
      return null;
    },
    clearApiKey() {},
    printSubcommandHelp() {},
    ...collectOutput(),
    ...overrides,
  };
}

test("auth status reports configured state with masked API key", async () => {
  const deps = createAuthDeps();

  await handleAuth("status", [], {}, { apiKey: "secret-key", baseUrl: "https://open.beervid.ai" }, deps);

  assert.equal(deps.calls.length, 1);
  assert.equal(deps.calls[0].command, "auth.status");
  assert.deepEqual(deps.calls[0].data, {
    configured: true,
    baseUrl: "https://open.beervid.ai",
    apiKey: "masked:secret-key",
  });
});

test("auth test checks both auth endpoints and reports merged output", async () => {
  const requests = [];
  const deps = createAuthDeps({
    async apiRequest(_config, request) {
      requests.push(request);
      if (request.path === "/check") {
        return { data: { data: { status: "ok", username: "ducky" } } };
      }
      if (request.path === "/profile") {
        return { data: { data: { username: "ducky" } } };
      }
      throw new Error(`Unexpected request: ${request.path}`);
    },
    findDeepValue(data, keys) {
      const source = data.data || data;
      for (const key of keys) {
        if (source[key] != null) return source[key];
      }
      return null;
    },
  });

  await handleAuth("test", [], {}, { apiKey: "secret-key", baseUrl: "https://open.beervid.ai" }, deps);

  assert.deepEqual(requests, [
    { method: "GET", path: "/check" },
    { method: "GET", path: "/profile" },
  ]);
  assert.equal(deps.calls[0].command, "auth.test");
  assert.match(deps.calls[0].textLines.join("\n"), /ducky/);
});
