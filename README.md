# Beervid CLI

First-pass zero-dependency CLI for the Beervid Open API.

## Quick Start

```bash
node ./bin/beervid.js auth set-key YOUR_API_KEY
node ./bin/beervid.js auth test
node ./bin/beervid.js auth check
node ./bin/beervid.js auth profile
node ./bin/beervid.js accounts list
node ./bin/beervid.js labels list
node ./bin/beervid.js templates list
node ./bin/beervid.js templates get --id template_xxx
node ./bin/beervid.js video upload --path ./assets/cover.jpg --type image
node ./bin/beervid.js video create --file ./examples/video-create.json
node ./bin/beervid.js video tasks get --task-id task_xxx
node ./bin/beervid.js video tasks watch --task-id task_xxx
node ./bin/beervid.js video list
node ./bin/beervid.js video publish --file ./examples/video-publish.json
node ./bin/beervid.js video data get --id publish_task_xxx
node ./bin/beervid.js publish strategy list
node ./bin/beervid.js publish products --creator-user-open-id creator_open_id_xxx
node ./bin/beervid.js publish strategy create --file ./examples/publish-strategy-template.json
node ./bin/beervid.js publish strategy enable --id strategy_xxx
node ./bin/beervid.js publish strategy get --id strategy_xxx
node ./bin/beervid.js publish strategy delete --id strategy_xxx
node ./bin/beervid.js publish records
```

## Video Create Rules

- `techType: "veo"` means the cinematic model. In each `fragmentList` item, `segmentCount` maps to duration: `1=8s`, `2=16s`, `3=24s`, `4=32s`.
- `techType: "sora"`, `sora_azure`, `sora_h_pro`, and `sora_aio` use the SORA family rules. Each fragment must use `segmentCount: 1`.
- `fragmentList.length` matches the number of UI chapters or scenes. Two 8-second VEO scenes should be modeled as two fragment objects with `segmentCount: 1` each.
- `videoScale` controls aspect ratio and accepts `9:16` or `16:9`.
- `portraitImages` is VEO-only, allows at most 1 image, and requires `useCoverFrame: true` when `videoScale` is `9:16`.
- `productReferenceImages` allows at most 3 images for VEO and at most 1 image for each SORA-family fragment.
- `nineGridImages` allows at most 9 images for each SORA-family fragment, and `nineGridImages` plus `productReferenceImages` must either both be provided or both be empty.
- `spliceMethod: "LONG_TAKE"` is not allowed for SORA-family fragments or for VEO fragments when `segmentCount` is `1`.

## Install Locally

```bash
npm link
```

Then run:

```bash
beervid --help
```

## Notes

- `video create` accepts raw open-API request bodies plus older `formData`/`request` wrappers and normalizes them before sending.
- `video create` and `video run` will auto-upload local file paths found in `productReferenceImages`, `nineGridImages`, `portraitImages`, `bgmList`, `headVideo`, and `endVideo`, then replace them with the returned `fileUrl`.
- `video publish` accepts either `businessId` or the older `accountId` alias and maps it to the open API shape.
- `publish strategy create` accepts the raw open-API request body plus the older `strategyCreateDTO` wrapper.
- `video create` and `video run` now validate `techType`, `fragmentList`, `segmentCount`, and `spliceMethod` before sending the request.
- `video upload` sends multipart form data, requires `--path` plus `--type image|video|audio`, and checks extension/size limits before upload.
- `video tasks get` queries the task list endpoint and matches by `task_id`.
- `video tasks watch` polls until the task reaches a terminal state.
- `video list` queries the video library and should be treated as the final source of generated videos.
- `publish strategy enable` and `publish strategy disable` now call the documented toggle API with an explicit `enable` boolean, so they are safe to run repeatedly.
