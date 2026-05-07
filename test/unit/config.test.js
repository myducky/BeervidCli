const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { loadConfig } = require("../../src/config");

test("loadConfig reports invalid config JSON with a CLI error", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "beervid-config-"));
  const configPath = path.join(tempDir, "config.json");
  fs.writeFileSync(configPath, "{bad config");

  assert.throws(
    () => loadConfig({ "config-path": configPath }),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /Invalid config file/);
      assert.match(error.message, /config\.json/);
      return true;
    },
  );
});

test("loadConfig rejects invalid timeout values", () => {
  assert.throws(
    () => loadConfig({ timeout: "abc" }),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--timeout must be a positive number/);
      return true;
    },
  );
});
