const test = require("node:test");
const assert = require("node:assert/strict");

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { parseArgs, readJsonInput } = require("../../src/utils");

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

test("readJsonInput reports invalid file JSON with a CLI error", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beervid-json-"));
  const filePath = path.join(tempDir, "bad.json");
  fs.writeFileSync(filePath, "{bad json");

  assert.throws(
    () => readJsonInput({ file: filePath }),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /Invalid JSON in/);
      assert.match(error.message, /bad\.json/);
      return true;
    },
  );
});
