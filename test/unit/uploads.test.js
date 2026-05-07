const test = require("node:test");
const assert = require("node:assert/strict");

const { formatFileSize, uploadFileContents } = require("../../src/uploads");

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

test("uploadFileContents can return upload details", async () => {
  const result = await uploadFileContents({
    config: { apiKey: "test-key" },
    buffer: Buffer.from("image"),
    fileName: "image.jpg",
    fileType: "image",
    sourceLabel: "image.jpg",
    mimeType: "image/jpeg",
    apiRequest: async () => ({ data: { data: { fileUrl: "https://cdn.example/image.jpg" } } }),
    returnDetails: true,
  });

  assert.deepEqual(result, {
    fileUrl: "https://cdn.example/image.jpg",
    fileName: "image.jpg",
    fileType: "image",
    size: 5,
    mimeType: "image/jpeg",
    sourceLabel: "image.jpg",
  });
});

test("formatFileSize formats bytes for CLI output", () => {
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(1536), "1.5 KB");
  assert.equal(formatFileSize(2 * 1024 * 1024), "2 MB");
});
