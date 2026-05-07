const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const { handleVideo } = require("../../src/commands/video");

test("video upload prints uploaded file details after upload succeeds", async () => {
  const outputs = [];
  const deps = {
    requireApiKey() {},
    async uploadLocalFile({ filePath, fileType, returnDetails }) {
      assert.equal(filePath, "fixture.mp4");
      assert.equal(fileType, "video");
      assert.equal(returnDetails, true);
      return {
        fileUrl: "https://cdn.example/fixture.mp4",
        size: 1024,
      };
    },
    formatFileSize(size) {
      return `${size} B`;
    },
    formatOutput(result) {
      outputs.push(result);
    },
    fail(message, exitCode = 1) {
      const error = new Error(message);
      error.exitCode = exitCode;
      throw error;
    },
    path,
  };

  await handleVideo(
    "upload",
    [],
    { path: "fixture.mp4", type: "video" },
    { apiKey: "test-key" },
    deps,
  );

  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].command, "video.upload");
  assert.match(outputs[0].textLines.join("\n"), /file_url: https:\/\/cdn.example\/fixture.mp4/);
});
