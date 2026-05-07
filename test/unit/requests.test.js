const test = require("node:test");
const assert = require("node:assert/strict");

const { buildVideoLibraryListRequest } = require("../../src/requests");

test("buildVideoLibraryListRequest rejects invalid pagination flags", () => {
  assert.throws(
    () => buildVideoLibraryListRequest({ size: "abc" }),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--size must be a positive integer/);
      return true;
    },
  );
});
