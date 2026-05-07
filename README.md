# Beervid CLI

Zero-dependency Node.js CLI for the Beervid Open API.

The CLI covers authentication, TikTok account lookup, labels, templates, video generation, video library publishing, publish strategies, publish records, and raw endpoint calls.

## API Coverage

The CLI wraps the documented Beervid Open API surface as first-class commands. Future endpoints can still be called with `beervid raw`.

| API | CLI |
| --- | --- |
| `GET /check` | `beervid auth check`, `beervid auth test` |
| `GET /profile` | `beervid auth profile`, `beervid auth test` |
| `GET /tt-accounts` | `beervid accounts list`, `beervid accounts shoppable` |
| `GET /templates/options` | `beervid templates list` |
| `GET /templates/{id}` | `beervid templates get --id <template_id>` |
| `GET /video-create/labels` | `beervid labels list` |
| `POST /shop-products/list` | `beervid publish products` |
| `POST /video-create` | `beervid video create`, `beervid video run`, `beervid workflow publish` |
| `GET /video-create/tasks` | `beervid video tasks list|get|watch`, workflow polling |
| `POST /video-create/upload` | `beervid video upload`, automatic asset upload in video payloads |
| `POST /videos/library/list` | `beervid video list`, `beervid video run`, `beervid workflow publish` |
| `POST /videos/library/publish` | `beervid video publish`, `beervid workflow publish` |
| `GET /video/publish-task/{id}` | `beervid video data get --id <publish_task_id>`, `beervid workflow publish` |
| `POST /strategies/list` | `beervid publish strategy list` |
| `GET /strategies/{id}` | `beervid publish strategy get --id <strategy_id>` |
| `POST /strategies/create` | `beervid publish strategy create`, `beervid publish run` |
| `POST /strategies/{id}/toggle` | `beervid publish strategy enable`, `beervid publish strategy disable`, `beervid publish run` |
| `DELETE /strategies/{id}` | `beervid publish strategy delete` |
| `POST /send-records/list` | `beervid publish records` |

## Requirements

- Node.js 18 or newer
- A Beervid Open API key

## Installation

```bash
npm install -g beervid-cli
beervid --help
```

The package exposes two equivalent binaries:

```bash
beervid --help
beervid-cli --help
```

You can also run without installing globally:

```bash
npx beervid-cli --help
```

For local development:

```bash
npm link
beervid --help
```

If zsh cannot find `beervid` after a global install, add npm's global bin directory to `PATH`:

```bash
export PATH="$(npm prefix -g)/bin:$PATH"
```

## Authentication

Save an API key:

```bash
beervid auth set-key YOUR_API_KEY
```

Check the configured key and connection:

```bash
beervid auth status
beervid auth test
beervid auth check
beervid auth profile
```

Remove the saved key:

```bash
beervid auth clear
```

Configuration is stored at:

```text
~/.config/beervid/config.json
```

You can override configuration with flags or environment variables:

```bash
BEERVID_API_KEY=YOUR_API_KEY beervid auth test
beervid --api-key YOUR_API_KEY --base-url https://open.beervid.ai auth test
beervid --config-path ./config.json auth status
```

## Global Options

```text
--json
--verbose
--quiet
--timeout <ms>
--api-key <key>
--base-url <url>
--config-path <path>
```

Pagination flags such as `--current` and `--size` must be positive integers. Timing flags such as `--timeout`, `--interval`, and `--initial-wait` are validated before requests are sent.

## Quick Start

```bash
beervid auth set-key YOUR_API_KEY
beervid auth test
beervid accounts list
beervid labels list
beervid templates list
beervid video create --file ./examples/video-create.json
beervid video tasks watch --task-id task_xxx --initial-wait 300
beervid video list --current 1 --size 5
```

## Commands

### Accounts

```bash
beervid accounts list [--shoppable-type <ALL|TT|TTS>] [--keyword <text>] [--current <n>] [--size <n>]
beervid accounts shoppable [--keyword <text>] [--current <n>] [--size <n>]
```

`accounts list` returns all bound accounts by default. Use the returned `businessId`/first-column account id for normal video publishing and strategy creation.

`accounts shoppable` is only a convenience view for TTS/shopping-cart-capable accounts. Use it when you need to confirm whether an account can attach products.

### Labels And Templates

```bash
beervid labels list
beervid templates list
beervid templates get --id template_xxx
```

### Video

```bash
beervid video upload --path ./assets/cover.jpg --type image
beervid video create --file ./examples/video-create.json
beervid video tasks list
beervid video tasks get --task-id task_xxx
beervid video tasks watch --task-id task_xxx --initial-wait 300
beervid video list --current 1 --size 10
beervid video publish --file ./examples/video-publish.json
beervid video data get --id video_xxx
beervid video run --file ./examples/video-create.json --initial-wait 300
beervid workflow publish --file ./examples/video-create.json --publish-file ./examples/video-publish.json --initial-wait 300
```

`video run` creates a task, watches it to a terminal state, then queries the video library.

`workflow publish` creates a video task, waits for completion, reads the newest generated video from the library unless `--video-id` is provided, publishes that video with the publish JSON body, then fetches the publish task data.

### Publish

```bash
beervid publish products --creator-user-open-id creator_open_id_xxx
beervid publish products --account-id account_xxx
beervid publish strategy list
beervid publish strategy get --id strategy_xxx
beervid publish strategy create --file ./examples/publish-strategy-template.json
beervid publish strategy enable --id strategy_xxx
beervid publish strategy disable --id strategy_xxx
beervid publish strategy delete --id strategy_xxx
beervid publish records
beervid publish run --file ./examples/publish-strategy-template.json
```

Product lookup uses `creatorUserOpenId`. Normal publishing and strategy creation use `businessId`.

If you already have `creatorUserOpenId`, query products directly:

```bash
beervid publish products --creator-user-open-id creator_open_id_xxx --current 1 --size 20 --json
```

If you only know the account `businessId`, use `--account-id`; the CLI will resolve the account's `creatorUserOpenId` from `accounts list` first, then query products with that value.

`publish run` creates a publish strategy and enables it in one flow.

### End-To-End Publish

Use this when testing the full create-and-publish path:

```bash
beervid workflow publish \
  --file ./examples/video-create.json \
  --publish-file ./examples/video-publish.json \
  --initial-wait 300
```

The workflow runs these steps:

```text
1. POST /video-create
2. GET /video-create/tasks until the video task reaches a terminal state
3. POST /videos/library/list to resolve the generated video id
4. POST /videos/library/publish
5. GET /video/publish-task/{publish_task_id}
```

Useful flags:

```text
--video-id <id>             publish a known video id instead of the first library result
--skip-publish-data         skip the final publish-task lookup
--initial-wait <seconds>    wait before polling video task status
--interval <seconds>        polling interval
--max-attempts <n>          max polling attempts
--json                      print the full workflow result
```

### Raw API Calls

Use `raw` when an endpoint is not wrapped yet:

```bash
beervid raw get /templates/options
beervid raw post /send-records/list --file ./examples/publish-records.json
```

Paths are resolved under `/api/v1/beervid`.

### Completion

```bash
beervid completion zsh
beervid completion bash
beervid completion fish
```

## JSON Input

Commands that submit request bodies accept JSON from a file or stdin:

```bash
beervid video create --file ./examples/video-create.json
cat ./examples/video-create.json | beervid video create --stdin
```

Invalid JSON is reported as a CLI error with the source path or `stdin`.

## Video Create Rules

`video create` and `video run` validate important payload rules locally before calling the API.

- `techType: "veo"` is the cinematic style path.
- `techType: "sora"`, `sora_azure`, `sora_h_pro`, and `sora_aio` are the realistic/SORA-family paths.
- VEO `segmentCount` maps to duration: `1=8s`, `2=16s`, `3=24s`, `4=32s`.
- A single-fragment VEO request with `segmentCount: 2` means two internal 8-second chapters, not one native 16-second take. Confirm it explicitly with `--confirm-veo-two-8s`.
- SORA-family requests must use exactly one fragment, and that fragment represents one 15-second generation.
- `fragmentList.length` should match the number of intended UI chapters or scenes.
- `videoScale` accepts `9:16` or `16:9`.
- `portraitImages` is VEO-only, allows at most one image, and requires `useCoverFrame: true` when `videoScale` is `9:16`.
- `productReferenceImages` allows at most three images for VEO and one image for SORA-family requests.
- `nineGridImages` is SORA-family only, allows at most nine images, and must be paired with `productReferenceImages`.
- `spliceMethod: "LONG_TAKE"` is not allowed for SORA-family requests or VEO fragments with `segmentCount: 1`.
- `fragmentList[].videoContent` is sent verbatim. The CLI does not rewrite, translate, trim, summarize, or otherwise alter prompt text.

Example confirmed VEO single-fragment 16-second request:

```bash
beervid video create --file ./examples/video-create-lg-c5-16s-single-fragment.json --confirm-veo-two-8s
```

## Asset Uploads

Manual upload:

```bash
beervid video upload --path ./assets/cover.jpg --type image
beervid video upload --path ./assets/music.mp3 --type audio
beervid video upload --path ./assets/intro.mp4 --type video
```

Manual upload output includes the resolved local path, upload type, file size, and returned `file_url`. Missing files, unsupported extensions, oversized files, and upload responses without `fileUrl` are treated as CLI errors before the value is used by later requests.

For `video create`, `video run`, and `workflow publish`, local file paths in these fields are uploaded automatically before the create request is submitted:

```text
bgmList
headVideo
endVideo
fragmentList[].productReferenceImages
fragmentList[].nineGridImages
fragmentList[].portraitImages
```

The CLI replaces each local path with the returned `fileUrl`. These fields may be plain strings or objects containing `fileUrl`, `fileURL`, `url`, or `src`; nested asset URLs are updated in place.

Remote `http/https` URLs are left unchanged by default. Use `--upload-remote-assets` only when a remote URL must be downloaded and re-uploaded to Beervid first.

Supported upload limits:

```text
image: .jpg, .jpeg, .png up to 7MB
video: .mp4, .mov up to 10MB
audio: .wav, .mp3 up to 5MB
```

If the upload endpoint succeeds but does not return a `fileUrl`, the CLI treats it as a failure.

## Examples

Ready-to-send or request-shape examples:

```text
examples/video-create.json
examples/video-create-lg-c5-16s.json
examples/video-create-lg-c5-16s-single-fragment.json
examples/video-create-lg-c5-16s-user-request.json
examples/video-create-lg-c5-verbatim-user-prompt.json
examples/video-create-xiaomi-sora-15s-verbatim-user-prompt.json
examples/video-list.json
examples/publish-records.json
```

Templates that require replacing placeholder values:

```text
examples/video-publish.json
examples/publish-products.json
examples/publish-strategy-template.json
```

## Development

Project layout:

```text
bin/beervid.js             executable entry
src/cli.js                 command routing and dependency wiring
src/commands/              command-family handlers
src/config.js              config loading and API key persistence
src/core.js                pure response and payload helpers
src/http.js                fetch wrapper and envelope handling
src/requests.js            request-body builders
src/tasks.js               task polling and status helpers
src/uploads.js             upload validation and multipart helpers
src/video-payload.js       video-create validation and asset preparation
src/workflows/             multi-step command workflows
test/                      node:test coverage
```

Run checks:

```bash
npm test
npm run test:unit
npm run test:commands
npm run test:cli
npm run check:syntax
npm run pack:check
```

`npm run pack:check` uses the project-local `.npm-cache` directory so it does not depend on the permissions of `~/.npm`.

## Error Codes

The CLI sets explicit exit codes for common failures:

```text
1  invalid input or usage
2  missing API key
3  unauthorized API response
4  request, transport, upload, or API envelope failure
5  expected response data not found
6  task watch timed out
```

## License

MIT
