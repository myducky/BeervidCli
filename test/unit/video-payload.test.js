const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { prepareVideoCreatePayload } = require("../../src/video-payload");

test("prepareVideoCreatePayload uploads nested asset URLs in headVideo endVideo and bgmList", async () => {
  const uploads = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "beervid-assets-"));
  const musicPath = path.join(dir, "music.mp3");
  const headPath = path.join(dir, "head.mp4");
  const endPath = path.join(dir, "end.mp4");
  const productPath = path.join(dir, "product.jpg");
  fs.writeFileSync(musicPath, "music");
  fs.writeFileSync(headPath, "head");
  fs.writeFileSync(endPath, "end");
  fs.writeFileSync(productPath, "product");

  const payload = await prepareVideoCreatePayload(
    { apiKey: "test-key" },
    {
      techType: "veo",
      videoScale: "9:16",
      bgmList: [
        {
          url: musicPath,
          name: "music",
        },
      ],
      headVideo: {
        fileUrl: headPath,
        duration: 3,
      },
      endVideo: {
        url: endPath,
      },
      fragmentList: [
        {
          videoContent: "Create a short video.",
          useCoverFrame: false,
          segmentCount: 1,
          spliceMethod: "SPLICE",
          productReferenceImages: [
            {
              url: productPath,
            },
          ],
        },
      ],
    },
    { quiet: true },
    async (_config, request) => {
      assert.equal(request.method, "POST");
      assert.equal(request.path, "/video-create/upload");
      const file = request.formData.get("file");
      const fileType = request.formData.get("fileType");
      uploads.push({ fileName: file.name, fileType });
      return {
        data: {
          data: {
            fileUrl: `https://cdn.example/${fileType}/${file.name}`,
          },
        },
      };
    },
  );

  assert.deepEqual(uploads, [
    { fileName: "music.mp3", fileType: "audio" },
    { fileName: "head.mp4", fileType: "video" },
    { fileName: "end.mp4", fileType: "video" },
    { fileName: "product.jpg", fileType: "image" },
  ]);
  assert.equal(payload.bgmList[0].url, "https://cdn.example/audio/music.mp3");
  assert.equal(payload.headVideo.fileUrl, "https://cdn.example/video/head.mp4");
  assert.equal(payload.endVideo.url, "https://cdn.example/video/end.mp4");
  assert.equal(payload.fragmentList[0].productReferenceImages[0].url, "https://cdn.example/image/product.jpg");
});

test("prepareVideoCreatePayload leaves non-local asset URLs unchanged when upload is not needed", async () => {
  const payload = await prepareVideoCreatePayload(
    { apiKey: "test-key" },
    {
      techType: "veo",
      videoScale: "9:16",
      headVideo: {
        fileUrl: "https://cdn.example/head.mp4",
      },
      fragmentList: [
        {
          videoContent: "Create a short video.",
          useCoverFrame: false,
          segmentCount: 1,
          spliceMethod: "SPLICE",
        },
      ],
    },
    { quiet: true },
    async () => {
      throw new Error("apiRequest should not be called");
    },
  );

  assert.equal(payload.headVideo.fileUrl, "https://cdn.example/head.mp4");
});
