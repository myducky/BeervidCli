const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSendRecordsRequest,
  buildStrategyListRequest,
  buildVideoLibraryListRequest,
} = require("../../src/requests");

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

test("buildVideoLibraryListRequest rejects invalid numeric filters", () => {
  assert.throws(
    () => buildVideoLibraryListRequest({ "audit-status": "abc" }),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--audit-status must be a number/);
      return true;
    },
  );
});

test("buildStrategyListRequest rejects invalid status filter", () => {
  assert.throws(
    () => buildStrategyListRequest({ status: "abc" }),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--status must be a number/);
      return true;
    },
  );
});

test("buildSendRecordsRequest rejects invalid status filter", () => {
  assert.throws(
    () => buildSendRecordsRequest({ status: "abc" }),
    (error) => {
      assert.equal(error.exitCode, 1);
      assert.match(error.message, /--status must be a number/);
      return true;
    },
  );
});
