const test = require("node:test");
const assert = require("node:assert/strict");

const { parseArgs } = require("../../src/utils");

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
