const test = require("node:test");
const assert = require("node:assert/strict");

const { getEnvelopeFailure } = require("../src/http");

test("getEnvelopeFailure ignores successful envelopes", () => {
  assert.equal(
    getEnvelopeFailure({ code: 0, message: "success", error: false, success: true }),
    null,
  );
  assert.equal(
    getEnvelopeFailure({ code: 200, message: "success", error: false, success: true }),
    null,
  );
});

test("getEnvelopeFailure detects business failure envelopes", () => {
  assert.equal(
    getEnvelopeFailure({
      code: 200100,
      message: "Not enough credits to create video",
      error: true,
      success: false,
    }),
    "Not enough credits to create video\ncode: 200100",
  );
});
