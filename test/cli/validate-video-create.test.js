const test = require("node:test");
const assert = require("node:assert/strict");

const { validateVideoCreatePayload } = require("../../src/cli");

test("validateVideoCreatePayload requires explicit confirmation for veo single-fragment 16s", () => {
  assert.throws(
    () => validateVideoCreatePayload({
      techType: "veo",
      fragmentList: [
        {
          videoContent: "16s cinematic request",
          useCoverFrame: false,
          segmentCount: 2,
          spliceMethod: "SPLICE",
        },
      ],
    }),
    /--confirm-veo-two-8s/,
  );
});

test("validateVideoCreatePayload accepts confirmed veo single-fragment 16s", () => {
  const payload = {
    techType: "veo",
    fragmentList: [
      {
        videoContent: "16s cinematic request",
        useCoverFrame: false,
        segmentCount: 2,
        spliceMethod: "SPLICE",
      },
    ],
  };

  assert.deepEqual(
    validateVideoCreatePayload(payload, { "confirm-veo-two-8s": true }),
    payload,
  );
});

test("validateVideoCreatePayload requires a single fragment for sora-family requests", () => {
  assert.throws(
    () => validateVideoCreatePayload({
      techType: "sora",
      fragmentList: [
        {
          videoContent: "first 15s realistic shot",
          useCoverFrame: false,
          segmentCount: 1,
          spliceMethod: "SPLICE",
        },
        {
          videoContent: "second 15s realistic shot",
          useCoverFrame: false,
          segmentCount: 1,
          spliceMethod: "SPLICE",
        },
      ],
    }),
    /single fragment only/,
  );
});
