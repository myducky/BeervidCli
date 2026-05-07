const test = require("node:test");
const assert = require("node:assert/strict");

const { getEnvelopeFailure } = require("../../src/http");

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

test("apiRequest wraps timeout aborts with CLI exit code", async () => {
  const { apiRequest } = require("../../src/http");
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => {
      reject(new Error("This operation was aborted"));
    });
  });

  try {
    await assert.rejects(
      () => apiRequest({
        apiKey: "test-key",
        baseUrl: "https://open.beervid.ai",
        timeout: 1,
      }, {
        method: "GET",
        path: "/check",
      }),
      (error) => {
        assert.equal(error.exitCode, 4);
        assert.match(error.message, /Request failed/);
        return true;
      },
    );
  } finally {
    global.fetch = originalFetch;
  }
});
