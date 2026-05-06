const test = require("node:test");
const assert = require("node:assert/strict");

const { handleLabels, handleTemplates } = require("../../src/commands/templates");
const { collectOutput } = require("../support/command-output");

function createTemplateDeps(overrides = {}) {
  return {
    requireApiKey() {},
    async apiRequest() {
      throw new Error("apiRequest should be stubbed in this test");
    },
    findRecords(data) {
      return data.data.records;
    },
    fail(message, exitCode = 1) {
      const error = new Error(message);
      error.exitCode = exitCode;
      throw error;
    },
    findDeepValue(data, keys) {
      const source = data.data || data;
      for (const key of keys) {
        if (source[key] != null) return source[key];
      }
      return null;
    },
    printSubcommandHelp() {},
    ...collectOutput(),
    ...overrides,
  };
}

test("labels list fetches the labels endpoint", async () => {
  const requests = [];
  const deps = createTemplateDeps({
    async apiRequest(_config, request) {
      requests.push(request);
      return {
        data: {
          data: {
            records: [{ id: "label_1", name: "Summer" }],
          },
        },
      };
    },
  });

  await handleLabels("list", {}, { apiKey: "test-key" }, deps);

  assert.deepEqual(requests, [
    { method: "GET", path: "/video-create/labels" },
  ]);
  assert.equal(deps.calls[0].command, "labels.list");
});

test("templates get requires an id flag", async () => {
  const deps = createTemplateDeps();

  await assert.rejects(
    () => handleTemplates("get", {}, { apiKey: "test-key" }, deps),
    /Usage: beervid templates get --id <template_id>/,
  );
});

test("templates get formats template details from nested data", async () => {
  const requests = [];
  const deps = createTemplateDeps({
    async apiRequest(_config, request) {
      requests.push(request);
      return {
        data: {
          data: {
            name: "Hero Template",
            techType: "veo",
            videoScale: "9:16",
          },
        },
      };
    },
  });

  await handleTemplates("get", { id: "tpl_1" }, { apiKey: "test-key" }, deps);

  assert.deepEqual(requests, [
    { method: "GET", path: "/templates/tpl_1" },
  ]);
  assert.equal(deps.calls[0].command, "templates.get");
  assert.match(deps.calls[0].textLines.join("\n"), /Hero Template/);
});
