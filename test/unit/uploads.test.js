const test = require("node:test");
const assert = require("node:assert/strict");

const { uploadFileContents } = require("../../src/uploads");

test("uploadFileContents fails when upload response has no fileUrl", async () => {
  await assert.rejects(
    () => uploadFileContents({
      config: { apiKey: "test-key" },
      buffer: Buffer.from("image"),
      fileName: "image.jpg",
      fileType: "image",
      sourceLabel: "image.jpg",
      mimeType: "image/jpeg",
      apiRequest: async () => ({ data: { code: 0, message: "success", data: {} } }),
    }),
    (error) => {
      assert.equal(error.exitCode, 5);
      assert.match(error.message, /no fileUrl/);
      return true;
    },
  );
});
