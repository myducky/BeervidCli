const test = require("node:test");
const assert = require("node:assert/strict");

const { handleRaw, handleCompletion } = require("../../src/commands/misc");

function createMiscDeps(overrides = {}) {
  return {
    requireApiKey() {},
    fail(message, exitCode = 1) {
      const error = new Error(message);
      error.exitCode = exitCode;
      throw error;
    },
    async apiRequest() {
      throw new Error("apiRequest should be stubbed in this test");
    },
    readJsonInput() {
      return undefined;
    },
    formatOutput() {},
    printSubcommandHelp() {},
    ...overrides,
  };
}

test("raw get normalizes the target path and forces JSON output", async () => {
  const requests = [];
  const outputs = [];
  const deps = createMiscDeps({
    async apiRequest(_config, request) {
      requests.push(request);
      return { data: { ok: true } };
    },
    formatOutput(result) {
      outputs.push(result);
    },
  });

  await handleRaw("get", ["templates/options"], {}, { apiKey: "test-key" }, deps);

  assert.deepEqual(requests, [
    { method: "GET", path: "/templates/options", body: undefined },
  ]);
  assert.equal(outputs[0].flags.json, true);
  assert.equal(outputs[0].command, "raw.get");
});

test("completion bash prints the bash completion script", () => {
  const writes = [];
  const originalWrite = process.stdout.write;
  process.stdout.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };

  try {
    handleCompletion("bash", createMiscDeps());
  } finally {
    process.stdout.write = originalWrite;
  }

  assert.match(writes.join(""), /complete -W/);
});
