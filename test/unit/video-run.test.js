const test = require("node:test");
const assert = require("node:assert/strict");

const { runVideoWorkflow } = require("../../src/workflows/video-run");

test("runVideoWorkflow stops before video list when task fails", async () => {
  const calls = [];

  await assert.rejects(
    () => runVideoWorkflow({
      config: { apiKey: "test-key" },
      flags: {},
      body: { name: "failed video" },
      prepareVideoCreatePayload: async (_config, body) => body,
      apiRequest: async (_config, request) => {
        calls.push(request);
        if (request.path === "/video-create") return { data: { taskId: "task_failed" } };
        throw new Error(`Unexpected request: ${request.path}`);
      },
      findTaskId: () => "task_failed",
      watchTask: async () => ({ taskId: "task_failed", status: "failed", errorMessage: "render failed" }),
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

test("runVideoWorkflow lists videos scoped to the created task id", async () => {
  const listBodies = [];
  const result = await runVideoWorkflow({
    config: { apiKey: "test-key" },
    flags: { current: 1, size: 10 },
    body: { name: "successful video" },
    prepareVideoCreatePayload: async (_config, body) => body,
    apiRequest: async (_config, request) => {
      if (request.path === "/video-create") return { data: { taskId: "task_123" } };
      if (request.path === "/videos/library/list") {
        listBodies.push(request.body);
        return { data: { records: [{ id: "video_from_task_123", taskId: "task_123" }] } };
      }
      throw new Error(`Unexpected request: ${request.path}`);
    },
    findTaskId: () => "task_123",
    watchTask: async () => ({ taskId: "task_123", status: "success" }),
    isSuccessStatus: () => true,
    buildVideoLibraryListRequest: (flags) => ({
      current: Number(flags.current),
      size: Number(flags.size),
      taskIds: String(flags["task-ids"]).split(","),
    }),
    findRecords: (data) => data.records,
  });

  assert.deepEqual(listBodies, [
    { current: 1, size: 10, taskIds: ["task_123"] },
  ]);
  assert.equal(result.summary.latestVideoId, "video_from_task_123");
});
