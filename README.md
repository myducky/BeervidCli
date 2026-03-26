# Beervid CLI

First-pass zero-dependency CLI for the Beervid Open API.

## Positioning

This CLI targets the Beervid product-side API surface used for video generation, templates, publish strategies, and library workflows.

It is not the same thing as the Beervid third-party application Open API:

- Use this CLI when you want broad internal/product capabilities such as `labels`, `templates`, `video create`, `video tasks`, `video list`, `publish strategy`, and `raw`.
- Use a separate third-party/Open API tool when your primary goal is TT/TTS OAuth onboarding or app-facing publish flows.

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

## Install

Install from npm:

```bash
npm install -g beervid-cli
beervid --help
beervid-cli --help
```

Or run it without installing globally:

```bash
npx beervid-cli --help
npx beervid-cli auth set-key YOUR_API_KEY
npx beervid-cli auth test
```

Published binary names:

- `beervid`
- `beervid-cli`

Install from the local repo while iterating:

```bash
npm link
beervid --help
```

## Development

Current code layout:

- `src/commands/` contains command-family handlers
- `src/workflows/` contains multi-step command orchestration
- `src/core.js` contains pure normalization and status helpers
- `src/help.js` contains shared CLI help text

Local helper tests:

```bash
npm test
npm run test:helpers
```

## Cookbook

### Check auth and account access

```bash
node ./bin/beervid.js auth set-key YOUR_API_KEY
node ./bin/beervid.js auth test
node ./bin/beervid.js auth profile
node ./bin/beervid.js accounts list
node ./bin/beervid.js accounts shoppable
```

### Generate a video from local JSON and watch it finish

```bash
node ./bin/beervid.js video create --file ./examples/video-create.json
node ./bin/beervid.js video tasks watch --task-id task_xxx
node ./bin/beervid.js video list --current 1 --size 5
```

If you want the CLI to do the create-and-watch flow in one command:

```bash
node ./bin/beervid.js video run --file ./examples/video-create.json
```

### Upload local or remote assets before create

```bash
node ./bin/beervid.js video upload --path ./assets/cover.jpg --type image
node ./bin/beervid.js video upload --path ./assets/music.mp3 --type audio
```

For `video create` and `video run`, local paths and `http/https` asset URLs inside the payload are auto-uploaded before submit.

### Inspect labels and templates before building a payload

```bash
node ./bin/beervid.js labels list
node ./bin/beervid.js templates list
node ./bin/beervid.js templates get --id template_xxx
```

### Create, enable, and inspect a publish strategy

```bash
node ./bin/beervid.js publish strategy create --file ./examples/publish-strategy-template.json
node ./bin/beervid.js publish strategy enable --id strategy_xxx
node ./bin/beervid.js publish strategy get --id strategy_xxx
node ./bin/beervid.js publish records
```

If you want the CLI to create and enable in one pass:

```bash
node ./bin/beervid.js publish run --file ./examples/publish-strategy-template.json
```

### Debug an endpoint that is not wrapped yet

```bash
node ./bin/beervid.js raw get /templates/options
node ./bin/beervid.js raw post /send-records/list --file ./examples/publish-records.json
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

## Notes

- `video create` accepts raw open-API request bodies plus older `formData`/`request` wrappers and normalizes them before sending.
- `video create` and `video run` will auto-upload both local file paths and remote `http/https` URLs found in `productReferenceImages`, `nineGridImages`, `portraitImages`, `bgmList`, `headVideo`, and `endVideo`, then replace them with the returned `fileUrl` before submitting the task.
- `headVideo` and `endVideo` correspond to the cover/opening video and ending video in the product UI flow, so they follow the same upload-then-submit behavior as product images, portrait images, and BGM.
- `video publish` accepts either `businessId` or the older `accountId` alias and maps it to the open API shape.
- `publish strategy create` accepts the raw open-API request body plus the older `strategyCreateDTO` wrapper.
- `video create` and `video run` now validate `techType`, `fragmentList`, `segmentCount`, and `spliceMethod` before sending the request.
- `video upload` sends multipart form data, requires `--path` plus `--type image|video|audio`, and checks extension/size limits before upload.
- `video tasks get` queries the task list endpoint and matches by `task_id`.
- `video tasks watch` polls until the task reaches a terminal state.
- `video list` queries the video library and should be treated as the final source of generated videos.
- `publish strategy enable` and `publish strategy disable` now call the documented toggle API with an explicit `enable` boolean, so they are safe to run repeatedly.
