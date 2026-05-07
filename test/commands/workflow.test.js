const test = require("node:test");
const assert = require("node:assert/strict");

const { handleWorkflow } = require("../../src/commands/workflow");

test("workflow publish reads video and publish payloads and formats summary", async () => {
  const outputs = [];
  const deps = {
    requireApiKey() {},
    readJsonInput(flags) {
      if (flags.file === "video.json") return { video: true };
      if (flags.file === "publish.json") return { publish: true };
      throw new Error(`Unexpected file: ${flags.file}`);
    },
    async runEndToEndPublishWorkflow({ videoBody, publishBody }) {
      assert.deepEqual(videoBody, { video: true });
      assert.deepEqual(publishBody, { publish: true });
      return {
        create: {},
        task: {},
        videos: {},
        publish: {},
        publishTask: {},
        summary: {
          taskId: "task_123",
          videoId: "video_123",
          publishTaskId: "publish_123",
        },
      };
    },
    formatOutput(result) {
      outputs.push(result);
    },
    printSubcommandHelp() {},
  };

  await handleWorkflow(
    "publish",
    [],
    { file: "video.json", "publish-file": "publish.json" },
    { apiKey: "test-key" },
    deps,
  );

  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].command, "workflow.publish");
  assert.match(outputs[0].textLines.join("\n"), /publish_123/);
});
