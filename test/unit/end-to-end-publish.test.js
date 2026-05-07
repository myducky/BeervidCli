const test = require("node:test");
const assert = require("node:assert/strict");

const { runEndToEndPublishWorkflow } = require("../../src/workflows/end-to-end-publish");

test("runEndToEndPublishWorkflow creates video then publishes and fetches publish task data", async () => {
  const calls = [];
  const result = await runEndToEndPublishWorkflow({
    config: { apiKey: "test-key" },
    flags: {
      "publish-file": "publish.json",
    },
    videoBody: { name: "video payload" },
    publishBody: { businessId: "account_123" },
    prepareVideoCreatePayload: async (_config, body) => ({ ...body, prepared: true }),
    apiRequest: async (_config, request) => {
      calls.push(request);
      if (request.path === "/video-create") {
        return { data: { data: { taskId: "task_123" } } };
      }
      if (request.path === "/videos/library/list") {
        return { data: { data: { records: [{ id: "video_123", title: "Generated" }] } } };
      }
      if (request.path === "/videos/library/publish") {
        return { data: { data: { publishTaskId: "publish_123", status: "submitted" } } };
      }
      if (request.path === "/video/publish-task/publish_123") {
        return { data: { data: { id: "publish_123", status: "success" } } };
      }
      throw new Error(`Unexpected request: ${request.path}`);
    },
    findTaskId: () => "task_123",
    findDeepValue: (data, keys) => {
      const visit = (value) => {
        if (!value || typeof value !== "object") return null;
        for (const key of keys) {
          if (value[key] != null) return value[key];
        }
        for (const nested of Object.values(value)) {
          const found = visit(nested);
          if (found != null) return found;
        }
        return null;
      };
      return visit(data);
    },
    normalizeVideoPublishPayload: (body) => body,
    watchTask: async () => ({ taskId: "task_123", status: "success" }),
    buildVideoLibraryListRequest: (flags) => ({ current: 1, size: 10, taskIds: [flags["task-ids"]] }),
    findRecords: (data) => data.data.records,
  });

  assert.deepEqual(calls.map((call) => [call.method, call.path]), [
    ["POST", "/video-create"],
    ["POST", "/videos/library/list"],
    ["POST", "/videos/library/publish"],
    ["GET", "/video/publish-task/publish_123"],
  ]);
  assert.equal(calls[2].body.videoId, "video_123");
  assert.equal(calls[2].body.businessId, "account_123");
  assert.equal(result.summary.taskId, "task_123");
  assert.equal(result.summary.videoId, "video_123");
  assert.equal(result.summary.publishTaskId, "publish_123");
  assert.deepEqual(calls[1].body.taskIds, ["task_123"]);
});

test("runEndToEndPublishWorkflow requires publish task id by default", async () => {
  await assert.rejects(
    () => runEndToEndPublishWorkflow({
      config: { apiKey: "test-key" },
      flags: {},
      videoBody: {},
      publishBody: {},
      prepareVideoCreatePayload: async () => ({}),
      apiRequest: async (_config, request) => {
        if (request.path === "/video-create") return { data: { taskId: "task_123" } };
        if (request.path === "/videos/library/list") return { data: { records: [{ id: "video_123" }] } };
        if (request.path === "/videos/library/publish") return { data: { data: {} } };
        throw new Error(`Unexpected request: ${request.path}`);
      },
      findTaskId: () => "task_123",
      findDeepValue: () => null,
      normalizeVideoPublishPayload: (body) => body,
      watchTask: async () => ({ status: "success" }),
      buildVideoLibraryListRequest: () => ({}),
      findRecords: (data) => data.records,
    }),
    (error) => {
      assert.equal(error.exitCode, 5);
      assert.match(error.message, /publish_task_id/);
      return true;
    },
  );
});

test("runEndToEndPublishWorkflow stops before publish when video task fails", async () => {
  const calls = [];
  await assert.rejects(
    () => runEndToEndPublishWorkflow({
      config: { apiKey: "test-key" },
      flags: {},
      videoBody: {},
      publishBody: {},
      prepareVideoCreatePayload: async () => ({}),
      apiRequest: async (_config, request) => {
        calls.push(request);
        if (request.path === "/video-create") return { data: { taskId: "task_123" } };
        throw new Error(`Unexpected request: ${request.path}`);
      },
      findTaskId: () => "task_123",
      findDeepValue: () => null,
      normalizeVideoPublishPayload: (body) => body,
      watchTask: async () => ({ taskId: "task_123", status: "failed", errorMessage: "render failed" }),
      isSuccessStatus: () => false,
      buildVideoLibraryListRequest: () => ({}),
      findRecords: () => [],
    }),
    (error) => {
      assert.equal(error.exitCode, 5);
      assert.match(error.message, /Video task failed/);
      return true;
    },
  );

  assert.deepEqual(calls.map((call) => call.path), ["/video-create"]);
});
