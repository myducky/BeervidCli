# Beervid API Capabilities

Source: https://docs.beervid.ai/docs and API Reference pages under `/docs/api/*`.

This document is the local working map for Beervid Open API usage. It focuses on prerequisites, request shape, response shape, CLI mapping, and common integration pitfalls.

## Global Rules

- Base URL: `https://open.beervid.ai/api/v1/beervid`
- Authentication: every API call requires `X-API-KEY: <api_key>`.
- JSON calls should send `Content-Type: application/json`.
- CLI base URL omits `/api/v1/beervid`; the CLI appends that prefix internally.
- Common paginated request shape:

```json
{
  "request": {
    "current": 1,
    "size": 20
  }
}
```

- Common paginated response shape:

```json
{
  "code": 200,
  "data": {
    "records": [],
    "total": 0,
    "current": 1,
    "size": 20,
    "pages": 0
  }
}
```

## Identity Model

Be careful not to mix these identifiers:

| Identifier | Used for | How to get it |
| --- | --- | --- |
| `businessId` | publishing videos, creating publishing strategies, filtering publish records/video library | `GET /tt-accounts`; CLI: `beervid accounts list` |
| `creatorUserOpenId` | querying TikTok Shop / creator showcase products | `GET /tt-accounts`; CLI: `beervid accounts list --json` or `beervid accounts shoppable --json` |
| TikTok openID / username / creator ID | not accepted by product query | external TikTok identity; do not use for `/shop-products/list` |
| `videoId` | publishing an existing generated video | `POST /videos/library/list`; CLI: `beervid video list` |
| `taskId` | checking video generation task status | `POST /video-create` response; CLI: `beervid video create` |
| `strategyId` | enabling/disabling/deleting publishing strategies | `POST /strategies/create` or strategy list/get |
| `publishTaskId` | checking publish result/data | `POST /videos/library/publish` response |

## Prerequisites

- Create and configure an API key in the Beervid platform.
- Bind TikTok accounts before using account, publish, and strategy endpoints.
- Configure TikTok Shop / shopping cart authorization for accounts that need product anchors.
- Upload local images, videos, and audio before using them in video generation payloads. The CLI can auto-upload known local asset fields.
- For product anchors:
  - use `businessId` when publishing or creating strategies;
  - use `creatorUserOpenId` only when querying products.

## Authentication

### `GET /check`

Checks whether the API key is valid.

Prerequisites:
- Valid API key.

Request:
- Headers: `X-API-KEY`.
- No body.

Response:
- User/auth status fields such as `status`, `username`, or equivalent envelope data.

CLI:

```bash
beervid auth check
beervid auth test
```

### `GET /profile`

Returns current API key/user profile.

Prerequisites:
- Valid API key.

Response:
- User profile fields such as `userId`, `username`, `email`, `membershipTierCode`, `apiKeyName`.

CLI:

```bash
beervid auth profile
beervid auth test
```

Local-only auth helpers:

```bash
beervid auth set-key <api_key>
beervid auth status
beervid auth clear
```

## TikTok Accounts

### `GET /tt-accounts`

Queries bound TikTok accounts.

Prerequisites:
- TikTok accounts must be bound/authorized in Beervid.

Query parameters:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `current` | number | no | Page number; default `1` in CLI. |
| `size` | number | no | Page size; default `10` for list, `50` for shoppable. |
| `keyword` | string | no | Search keyword. |
| `shoppableType` | string | no | `ALL`, `TT`, or `TTS`. `ALL` returns all accounts; `TTS` returns shopping-capable accounts. |

Response fields:
- Account id fields: `businessId`, `id`, or `accountId`.
- Display fields: `displayName`, `name`.
- Product query field: `creatorUserOpenId`.

CLI:

```bash
beervid accounts list --shoppable-type ALL --current 1 --size 20 --json
beervid accounts list --shoppable-type TTS --json
beervid accounts shoppable --json
```

Notes:
- `accounts list` is the default all-account view. Use the account id / `businessId` for publishing and strategy creation.
- `accounts shoppable` is only a convenience TTS-capable subset. It should expose `creator_user_open_id` in text output.

## Labels

### `GET /video-create/labels`

Queries labels available for video generation.

Prerequisites:
- Valid API key.

Response fields:
- Label id: `id` or `labelId`.
- Label name: `name` or `labelName`.

CLI:

```bash
beervid labels list
```

## Video Templates

### `GET /templates/options`

Lists available video content template options.

Prerequisites:
- Valid API key.

Response fields:
- Template id: `value`, `id`, or `templateId`.
- Template name: `label`, `name`, or `templateName`.

CLI:

```bash
beervid templates list
```

### `GET /templates/{id}`

Gets template details.

Prerequisites:
- A template id from `/templates/options`.

Path parameters:
- `id`: template id.

Response fields:
- `name` / `label`
- `techType`
- `videoScale`
- template configuration fields.

CLI:

```bash
beervid templates get --id <template_id>
```

## File Upload

### `POST /video-create/upload`

Uploads a file for later video generation use.

Prerequisites:
- Valid API key.
- Local file must match file type and size limits.

Request:
- `multipart/form-data`
- Fields:
  - `file`: binary file.
  - `fileType`: `image`, `video`, or `audio`.

CLI validation:

| Type | Extensions | Max Size |
| --- | --- | --- |
| image | `.jpg`, `.jpeg`, `.png` | 7 MB |
| video | `.mp4`, `.mov` | 10 MB |
| audio | `.wav`, `.mp3` | 5 MB |

Response fields:
- `fileUrl` or `url`.

CLI:

```bash
beervid video upload --path ./assets/cover.jpg --type image
beervid video upload --path ./assets/intro.mp4 --type video
beervid video upload --path ./assets/bgm.mp3 --type audio
```

Auto-upload fields in `video create`:
- `bgmList`
- `headVideo`
- `endVideo`
- `fragmentList[].productReferenceImages`
- `fragmentList[].nineGridImages`
- `fragmentList[].portraitImages`

Local file paths in these fields are uploaded before `POST /video-create`. Existing `http/https` URLs are left unchanged unless `--upload-remote-assets` is used.

## Video Creation

### `POST /video-create`

Creates a video generation task in expert mode.

Prerequisites:
- Valid API key.
- Optional files have been uploaded or are provided as local paths for CLI auto-upload.
- Labels and templates may be fetched first if the payload references them.

Core request fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | Task/video name. |
| `techType` | string | yes | Examples: `veo`, `sora`, `sora_azure`, `sora_h_pro`, `sora_aio`. |
| `videoScale` | string | yes | `9:16` or `16:9`. |
| `dialogueLanguage` | string | no | Spoken language/accent. |
| `showTitle` | boolean | no | Show title. |
| `showSubtitle` | boolean | no | Show subtitles. |
| `noBgmMusic` | boolean | no | Disable background music. |
| `hdEnhancement` | boolean | no | HD enhancement. |
| `generatedQuantity` | number | no | Number of generated outputs. |
| `labelIds` | string[] | no | Label ids from `/video-create/labels`. |
| `fragmentList` | object[] | yes | Video fragment/chapter list. |

Fragment fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `uid` | string | yes | Client fragment identifier. |
| `videoContent` | string | yes | Prompt text. CLI sends this verbatim. |
| `segmentCount` | number | yes | VEO duration mapping; see notes below. |
| `spliceMethod` | string | yes | Example: `SPLICE`. |
| `useCoverFrame` | boolean | yes | Required for some image reference modes. |
| `productReferenceImages` | array | no | Product/reference image URLs or local paths. |
| `nineGridImages` | array | no | Sora-family grid images. |
| `portraitImages` | array | no | VEO portrait image. |
| `productReferenceDescription` | string | no | Text description for reference image/product. |
| `positivePrompt` | string | no | Positive prompt. |
| `negativePrompt` | string | no | Negative prompt. |

CLI validation notes:
- `techType=veo` maps `segmentCount` 1-4 to 8s/16s/24s/32s.
- VEO single-fragment 16s requires explicit `--confirm-veo-two-8s`.
- Sora-family requests allow one fragment only.
- `videoScale` accepts `9:16` or `16:9`.
- `portraitImages` is VEO-only, max 1 image, and requires `useCoverFrame=true` for `9:16`.
- `productReferenceImages`: max 3 for VEO, max 1 for Sora-family.
- `nineGridImages`: Sora-family only, max 9, and must be paired with `productReferenceImages`.
- `LONG_TAKE` is not allowed for Sora-family or VEO `segmentCount=1`.

Response fields:
- `taskId`, `task_id`, or nested `id`.
- Status fields, usually task status/progress.

CLI:

```bash
beervid video create --file ./examples/video-create.json --json
```

## Video Task Query

### `GET /video-create/tasks`

Queries video generation task list and status.

Prerequisites:
- Valid API key.
- A task id from `/video-create` if checking a specific task.

Query parameters:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | string/number | no | Filter by task status. |
| `current` | number | no | Page number. |
| `size` | number | no | Page size. |

Response fields:
- `records`: task list.
- Task id: `id` or `taskId`.
- Status/progress fields.
- Error fields such as `errorMessage`.

CLI:

```bash
beervid video tasks list --status 1 --current 1 --size 20 --json
beervid video tasks get --task-id <task_id> --json
beervid video tasks watch --task-id <task_id> --initial-wait 300 --interval 20 --max-attempts 30
```

Notes:
- `watch` polls until a terminal state and exits non-zero if the task fails.

## Video Library

### `POST /videos/library/list`

Queries generated video library.

Prerequisites:
- Valid API key.
- Video generation tasks must have succeeded to produce videos.

Request fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `current` | number | no | Page number. |
| `size` | number | no | Page size. |
| `name` | string | no | Name filter. |
| `sourceType` | string | no | Source filter. |
| `taskIds` | string[] | no | Filter by generation task ids. |
| `strategyIds` | string[] | no | Filter by strategy ids. |
| `businessIds` | string[] | no | Filter by publishing/business accounts. |
| `auditStatus` | number[] | no | Audit status filters. |
| `labelIds` | string[] | no | Label filters. |
| `dateRange` | string[] | no | Date range filter. |

Response fields:
- `records`: videos.
- Video id: `id` or `videoId`.
- Name/title fields.

CLI:

```bash
beervid video list --current 1 --size 20 --json
beervid video list --task-ids <task_id> --json
```

### `POST /videos/library/publish`

Publishes an existing video to a TikTok account.

Prerequisites:
- Valid API key.
- `videoId` from video library.
- `businessId` from `GET /tt-accounts`.
- TikTok account must be authorized and publish-capable.
- For product anchors, the account must be shopping-capable and product data must be valid.

Request fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `videoId` | string | yes | Generated video id. |
| `businessId` | string | yes | TikTok account/business id. |
| `caption` | string | no | Caption/text. |
| `productAnchorStatus` | boolean | no | Whether to attach product anchor. |
| product fields | varies | conditional | Required only when attaching products. |

CLI:

```bash
beervid video publish --file ./examples/video-publish.json --json
```

Notes:
- CLI maps `accountId` to `businessId` if provided in the JSON body.
- Publishing uses `businessId`, not `creatorUserOpenId`.

## TikTok Shop Products

### `POST /shop-products/list`

Queries TikTok Shop store products and creator showcase products.

Prerequisites:
- Valid API key.
- TikTok/TTS authorization must be configured for the target account.
- Use `creatorUserOpenId` from `/tt-accounts`; do not use TikTok openID, username, or creator ID.

Request fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `creatorUserOpenId` | string | yes | Account creator user open id from `/tt-accounts`. |
| `current` | number | no | Page number. |
| `size` | number | no | Page size. |

`/shop-products/list` uses top-level `current` and `size`. Do not wrap pagination in `request` for this endpoint.

Response fields:
- `records` or `products`: product list.
- Product id: `id` or `productId`.
- Product title/name: `title`, `name`, or `productName`.

CLI:

```bash
beervid publish products <businessId-or-accountId-or-creatorUserOpenId> --json
```

Notes:
- The short form accepts `businessId`, account `id` / `accountId`, or `creatorUserOpenId`.
- The CLI resolves account IDs through `/tt-accounts` and sends `creatorUserOpenId` to `/shop-products/list`.
- Without `--current`, the CLI fetches all product pages using `size=100`.
- Use `--current` and `--size` only for single-page pagination checks.
- If an account has products but the query returns zero, verify that the `creatorUserOpenId` belongs to the same TTS/shopping authorization context.

## Publishing Strategy Management

### `POST /strategies/list`

Queries publishing strategies.

Prerequisites:
- Valid API key.

Request fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `current` | number | no | Page number. |
| `size` | number | no | Page size. |
| `name` | string | no | Strategy name filter. |
| `status` | number | no | Enabled/status filter. |
| `businessId` | string | no | Account/business id filter. |
| `dateRange` | string[] | no | Date range. |
| `sort` | string | no | Sort field. |
| `order` | string | no | Sort direction. |

CLI:

```bash
beervid publish strategy list --current 1 --size 20 --json
beervid publish strategy list --business-id <businessId> --json
```

### `GET /strategies/{id}`

Gets publishing strategy details.

Prerequisites:
- Strategy id.

CLI:

```bash
beervid publish strategy get --id <strategy_id> --json
```

### `POST /strategies/create`

Creates a publishing strategy.

Prerequisites:
- `businessId` from `/tt-accounts`.
- Template ids if using `strategyType=TEMPLATE`.
- Optional product ids if product anchor is enabled.

Request fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | yes | Strategy name. |
| `businessId` | string | yes | Publishing account/business id. |
| `strategyType` | string | yes | Example: `TEMPLATE` or `VIDEO`. |
| `contentTemplates` | string[] | conditional | Template ids for template strategies. |
| `pushMode` | number | yes | Example values: `0` sequential, `1` random. |
| `pushTimeType` | number | yes | Example values: `0` scheduled, `1` periodic. |
| `pushConfig` | object | yes | Schedule, product anchor, execution config. |

Example:

```json
{
  "name": "Daily Product Publish",
  "businessId": "business_xxx",
  "strategyType": "TEMPLATE",
  "contentTemplates": ["template_xxx"],
  "pushMode": 0,
  "pushTimeType": 0,
  "pushConfig": {
    "productAnchorStatus": false,
    "execType": "LONG_TERM",
    "batchExecutedAt": [
      {
        "date": "2099-12-31",
        "times": ["10:00"]
      }
    ]
  }
}
```

CLI:

```bash
beervid publish strategy create --file ./examples/publish-strategy-template.json --json
```

Notes:
- Strategy creation/publishing uses `businessId`, not `creatorUserOpenId`.
- CLI unwraps `{ "strategyCreateDTO": { ... } }` if provided.
- Strategy execution is asynchronous. After enabling a strategy, wait 5-10 minutes after the target publish time configured in `pushConfig` before querying publish records. Do not disable the strategy immediately after that target publish time if you need to verify delayed execution.

### `POST /strategies/{id}/toggle`

Enables or disables a publishing strategy.

Request:

```json
{
  "enable": true
}
```

CLI:

```bash
beervid publish strategy enable --id <strategy_id>
beervid publish strategy disable --id <strategy_id>
```

### `DELETE /strategies/{id}`

Deletes a publishing strategy.

CLI:

```bash
beervid publish strategy delete --id <strategy_id>
```

## TikTok Publishing Records

### `POST /send-records/list`

Queries strategy and manual video publishing records.

Prerequisites:
- Valid API key.
- For strategy-triggered publishes, query records 5-10 minutes after the target publish time configured in `pushConfig` because scheduler execution can be delayed.

Request fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `current` | number | no | Page number. |
| `size` | number | no | Page size. |
| `strategyId` | string | no | Strategy filter. |
| `businessId` | string | no | Account/business filter. |
| `status` | number | no | Publish status filter. |
| `workType` | string[] | no | Work type filter. |
| `sort` | string | no | Sort field. |
| `order` | string | no | Sort direction. |
| `startTime` | string | no | Start time filter. |
| `endTime` | string | no | End time filter. |

Status values documented in workflow examples:
- `0`: publishing
- `1`: video creation failed
- `2`: publish failed
- `3`: publish succeeded

CLI:

```bash
beervid publish records --current 1 --size 20 --json
beervid publish records --business-id <businessId> --status 3 --json
```

## Video Data Query

### `GET /video/publish-task/{id}`

Queries detailed data for a published video/publish task.

Prerequisites:
- A publish task id or id accepted by this endpoint.

Response fields:
- View/play count: `playCount` or `views`.
- Likes: `likeCount` or `likes`.
- Comments: `commentCount` or `comments`.
- Shares: `shareCount` or `shares`.
- `publishedAt`.

CLI:

```bash
beervid video data get --id <publish_task_id_or_video_id> --json
```

## Raw API Escape Hatch

Use raw calls when the official API exposes a new field or endpoint before CLI support is added.

```bash
beervid raw get /tt-accounts --json
beervid raw post /shop-products/list --file ./examples/publish-products.json --json
beervid raw post /send-records/list --file ./examples/publish-records.json --json
```

## End-To-End Workflows

### Video Generation Workflow

```text
1. Optional: GET /templates/options and GET /video-create/labels
2. Optional: POST /video-create/upload for local assets
3. POST /video-create
4. GET /video-create/tasks until terminal state
5. POST /videos/library/list filtered by task id
```

CLI:

```bash
beervid video run --file ./examples/video-create.json --initial-wait 300 --json
```

### Publish Existing Video

```text
1. GET /tt-accounts to get businessId
2. POST /videos/library/list to get videoId
3. Optional: POST /shop-products/list with creatorUserOpenId to get product id
4. POST /videos/library/publish with businessId and videoId
5. GET /video/publish-task/{publishTaskId}
```

CLI:

```bash
beervid video publish --file ./examples/video-publish.json --json
beervid video publish-run --file ./examples/video-create.json --publish-file ./examples/video-publish.json --initial-wait 300 --json
```

### Publishing Strategy Workflow

```text
1. GET /tt-accounts to get businessId and creatorUserOpenId
2. Optional: POST /shop-products/list with creatorUserOpenId
3. GET /templates/options
4. POST /strategies/create with businessId
5. POST /strategies/{id}/toggle
6. POST /send-records/list
```

CLI:

```bash
beervid publish run --file ./examples/publish-strategy-template.json --json
```

## CLI Coverage Matrix

| API capability | Endpoint | CLI command |
| --- | --- | --- |
| Auth check | `GET /check` | `beervid auth check`, `beervid auth test` |
| Profile | `GET /profile` | `beervid auth profile`, `beervid auth test` |
| TikTok accounts | `GET /tt-accounts` | `beervid accounts list`, `beervid accounts shoppable` |
| Labels | `GET /video-create/labels` | `beervid labels list` |
| Template list | `GET /templates/options` | `beervid templates list` |
| Template detail | `GET /templates/{id}` | `beervid templates get --id` |
| File upload | `POST /video-create/upload` | `beervid video upload`, auto-upload in `video create` |
| Video create | `POST /video-create` | `beervid video create`, `beervid video run`, `workflow publish` |
| Video tasks | `GET /video-create/tasks` | `beervid video tasks list/get/watch` |
| Video library | `POST /videos/library/list` | `beervid video list` |
| Video publish | `POST /videos/library/publish` | `beervid video publish`, `video publish-run`, `workflow publish` |
| Shop products | `POST /shop-products/list` | `beervid publish products` |
| Strategy list | `POST /strategies/list` | `beervid publish strategy list` |
| Strategy get | `GET /strategies/{id}` | `beervid publish strategy get` |
| Strategy create | `POST /strategies/create` | `beervid publish strategy create`, `publish run` |
| Strategy toggle | `POST /strategies/{id}/toggle` | `beervid publish strategy enable/disable`, `publish run` |
| Strategy delete | `DELETE /strategies/{id}` | `beervid publish strategy delete` |
| Publish records | `POST /send-records/list` | `beervid publish records` |
| Video data | `GET /video/publish-task/{id}` | `beervid video data get` |
| Raw new endpoints | any supported HTTP method | `beervid raw <method> <path>` |
