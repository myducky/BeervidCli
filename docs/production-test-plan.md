# Beervid CLI Production Test Plan

This plan is for validating every CLI command against production. Run it with a dedicated test account, test products, and throwaway strategy/video names.

## Scope

Test package: `beervid-cli@0.1.13`

Command families covered:

- `auth`
- `accounts`
- `labels`
- `templates`
- `video`
- `publish`
- `workflow`
- `raw`
- `completion`

## Safety Rules

- Use a dedicated production test TikTok/TTS account.
- Use non-advertising smoke-test content only.
- Keep `productAnchorStatus: false` unless a product-anchor test is explicitly approved.
- Name created resources with `Production CLI smoke test`.
- Do not enable a strategy that can send real content immediately. Strategy templates here use a future date.
- Delete the test strategy at the end.
- Do not commit `.env.production-test` or `examples/production/*.local.json`.

## Materials To Prepare

Create local files:

```text
.env.production-test
examples/production/assets/test-image.jpg
examples/production/assets/test-video.mp4
examples/production/assets/test-audio.mp3
examples/production/video-create.local.json
examples/production/video-publish.local.json
examples/production/publish-products.local.json
examples/production/publish-strategy.local.json
examples/production/video-list.local.json
examples/production/publish-records.local.json
```

Required production values:

```text
BEERVID_API_KEY
BEERVID_BASE_URL
BEERVID_TEST_ACCOUNT_ID
BEERVID_TEST_CREATOR_USER_OPEN_ID
BEERVID_TEST_TEMPLATE_ID
BEERVID_TEST_LABEL_ID, optional
```

Required asset limits:

```text
image: .jpg, .jpeg, .png up to 7MB
video: .mp4, .mov up to 10MB
audio: .wav, .mp3 up to 5MB
```

Prepare env:

```bash
cp examples/production/env.template .env.production-test
source ./.env.production-test
```

Prepare request bodies:

```bash
cp examples/production/video-create-production-template.json examples/production/video-create.local.json
cp examples/production/video-publish-production-template.json examples/production/video-publish.local.json
cp examples/production/publish-products-production-template.json examples/production/publish-products.local.json
cp examples/production/publish-strategy-production-template.json examples/production/publish-strategy.local.json
cp examples/production/video-list-production-template.json examples/production/video-list.local.json
cp examples/production/publish-records-production-template.json examples/production/publish-records.local.json
```

Replace placeholders in `*.local.json` before running write commands.

## Preflight

```bash
node -v
npm view beervid-cli version
npx beervid-cli@0.1.13 --help
npx beervid-cli@0.1.13 completion zsh
npx beervid-cli@0.1.13 completion bash
npx beervid-cli@0.1.13 completion fish
```

Expected:

- Node is `>=18`.
- npm version is `0.1.13`.
- Help and completion commands print output without API calls.

## Auth And Config

Use env-driven auth first:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 auth status
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 auth check --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 auth profile --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 auth test --json
```

Optional config-file validation:

```bash
npx beervid-cli@0.1.13 --config-path ./tmp/prod-cli-config.json auth set-key "$BEERVID_API_KEY"
npx beervid-cli@0.1.13 --config-path ./tmp/prod-cli-config.json auth status
npx beervid-cli@0.1.13 --config-path ./tmp/prod-cli-config.json auth clear
```

## Read-Only API Commands

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 accounts list --current 1 --size 10 --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 accounts list --shoppable-type TT --current 1 --size 10
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 accounts list --shoppable-type TTS --current 1 --size 10
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 accounts shoppable --current 1 --size 10

BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 labels list --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 templates list --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 templates get --id "$BEERVID_TEST_TEMPLATE_ID" --json

BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish products --file examples/production/publish-products.local.json --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish products --account-id "$BEERVID_TEST_ACCOUNT_ID" --current 1 --size 10
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish strategy list --current 1 --size 10 --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish records --file examples/production/publish-records.local.json --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video list --file examples/production/video-list.local.json --json
```

## Raw Endpoint Checks

Use raw for endpoint parity checks:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 raw get /check
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 raw get /profile
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 raw get /templates/options
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 raw post /shop-products/list --file examples/production/publish-products.local.json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 raw post /send-records/list --file examples/production/publish-records.local.json
```

## Upload Commands

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video upload --path "$BEERVID_TEST_IMAGE" --type image --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video upload --path "$BEERVID_TEST_VIDEO" --type video --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video upload --path "$BEERVID_TEST_AUDIO" --type audio --json
```

Copy the returned image `fileUrl` into `examples/production/video-create.local.json` if the video-create test uses `productReferenceImages`.

For video-create payloads, local paths in `bgmList`, `headVideo`, `endVideo`, `productReferenceImages`, `nineGridImages`, and `portraitImages` are uploaded automatically. Existing `http/https` URLs should normally be left as-is; add `--upload-remote-assets` only when the remote URL must be copied into Beervid storage first.

## Video Creation And Task Commands

Create:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video create --file examples/production/video-create.local.json --json
```

Set the returned task id:

```bash
export BEERVID_TEST_TASK_ID="RETURNED_TASK_ID"
```

Task checks:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video tasks list --current 1 --size 10 --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video tasks get --task-id "$BEERVID_TEST_TASK_ID" --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video tasks watch --task-id "$BEERVID_TEST_TASK_ID" --initial-wait 300 --interval 20 --max-attempts 30 --json
```

List generated videos and set video id:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video list --file examples/production/video-list.local.json --json
export BEERVID_TEST_VIDEO_ID="RETURNED_VIDEO_ID"
```

## Video Publish Commands

Replace `videoId` in `examples/production/video-publish.local.json`, then run:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video publish --file examples/production/video-publish.local.json --json
export BEERVID_TEST_PUBLISH_TASK_ID="RETURNED_PUBLISH_TASK_ID"
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 video data get --id "$BEERVID_TEST_PUBLISH_TASK_ID" --json
```

## End-To-End Workflow

Use this after the individual commands have passed:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 workflow publish --file examples/production/video-create.local.json --publish-file examples/production/video-publish.local.json --initial-wait 300 --interval 20 --max-attempts 30 --skip-publish-data --json
```

If the publish endpoint returns a publish task id reliably, run without `--skip-publish-data`:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 workflow publish --file examples/production/video-create.local.json --publish-file examples/production/video-publish.local.json --initial-wait 300 --interval 20 --max-attempts 30 --json
```

## Publish Strategy Commands

Create:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish strategy create --file examples/production/publish-strategy.local.json --json
export BEERVID_TEST_STRATEGY_ID="RETURNED_STRATEGY_ID"
```

Get:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish strategy get --id "$BEERVID_TEST_STRATEGY_ID" --json
```

Enable only after confirming the target publish time in `pushConfig` is a future date. If you need to verify a strategy-triggered publish, keep the strategy enabled until 5-10 minutes after that target publish time, then query publish records before disabling it:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish strategy enable --id "$BEERVID_TEST_STRATEGY_ID" --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish records --strategy-id "$BEERVID_TEST_STRATEGY_ID" --current 1 --size 10 --json
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish strategy disable --id "$BEERVID_TEST_STRATEGY_ID" --json
```

Create and enable in one flow:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish run --file examples/production/publish-strategy.local.json --json
```

Cleanup:

```bash
BEERVID_API_KEY="$BEERVID_API_KEY" BEERVID_BASE_URL="$BEERVID_BASE_URL" npx beervid-cli@0.1.13 publish strategy delete --id "$BEERVID_TEST_STRATEGY_ID" --json
```

## Negative Local Validation Checks

These should fail before or without harmful API side effects:

```bash
npx beervid-cli@0.1.13 accounts list
BEERVID_API_KEY="$BEERVID_API_KEY" npx beervid-cli@0.1.13 publish products --current abc
BEERVID_API_KEY="$BEERVID_API_KEY" npx beervid-cli@0.1.13 video upload --path ./missing.jpg --type image
BEERVID_API_KEY="$BEERVID_API_KEY" npx beervid-cli@0.1.13 video upload --path "$BEERVID_TEST_IMAGE" --type doc
BEERVID_API_KEY="$BEERVID_API_KEY" npx beervid-cli@0.1.13 templates get
BEERVID_API_KEY="$BEERVID_API_KEY" npx beervid-cli@0.1.13 video tasks watch --task-id "$BEERVID_TEST_TASK_ID" --interval 0
```

Expected exit codes:

```text
1 invalid input or usage
2 missing API key
5 expected response data not found
6 task watch timed out
```

## Result Log

Use this table while running production validation:

| Area | Command | Result | Output id or note |
| --- | --- | --- | --- |
| auth | `auth test` |  |  |
| accounts | `accounts list` |  |  |
| labels | `labels list` |  |  |
| templates | `templates list/get` |  |  |
| products | `publish products` |  |  |
| upload | `video upload image/video/audio` |  |  |
| create | `video create` |  | task id |
| task | `video tasks get/watch` |  |  |
| video list | `video list` |  | video id |
| publish | `video publish` |  | publish task id |
| data | `video data get` |  |  |
| workflow | `workflow publish` |  |  |
| strategy | `strategy create/get/enable/disable/delete` |  | strategy id |
| raw | `raw get/post` |  |  |
| completion | `completion zsh/bash/fish` |  |  |

## Go/No-Go

Go only if:

- Auth endpoints pass.
- Read-only commands return valid production data.
- Upload returns `fileUrl` for image, video, and audio.
- Video creation returns a task id.
- Task watch reaches success.
- Video list can resolve the generated video.
- Video publish returns a publish task id or a documented success response.
- Publish strategy can be created, queried, disabled, and deleted.
- Strategy-triggered publish records are checked 5-10 minutes after the target publish time configured in `pushConfig`.
- No command prints malformed JSON in `--json` mode.

No-go if:

- Auth/profile fails with the expected production key.
- Any write command creates an unexpected live schedule or sends content unintentionally.
- Any command exits zero while the API envelope reports business failure.
- Generated content or published content cannot be traced and cleaned up.
