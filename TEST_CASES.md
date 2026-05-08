# Beervid CLI Test Cases

Version under test: `beervid-cli@0.1.13` plus current unreleased fixes.

This file is the complete regression matrix for local automated tests and production manual validation. Production execution details and command snippets are in `docs/production-test-plan.md`.

## Verification Commands

Run before release:

```bash
npm run check:syntax
npm test
npm run pack:check
```

Expected local status:

```text
all syntax checks pass
all node:test suites pass
package dry-run includes bin, src, examples, README
```

## Command Coverage

| Area | Commands |
| --- | --- |
| Auth | `auth set-key`, `auth status`, `auth test`, `auth check`, `auth profile`, `auth clear` |
| Accounts | `accounts list`, `accounts shoppable` |
| Labels | `labels list` |
| Templates | `templates list`, `templates get` |
| Video | `video upload`, `video create`, `video tasks list/get/watch`, `video list`, `video publish`, `video data get`, `video run`, `video publish-run` |
| Publish | `publish products`, `publish records`, `publish strategy list/get/create/enable/disable/delete`, `publish run` |
| Workflow | `workflow publish` |
| Raw | `raw get/post/put/patch/delete` |
| Completion | `completion zsh/bash/fish` |

## Automated Test Mapping

| File | Coverage |
| --- | --- |
| `test/unit/core.test.js` | payload normalization, task/status/id extraction |
| `test/unit/config.test.js` | invalid config JSON, invalid timeout |
| `test/unit/http.test.js` | API envelope failure handling, timeout wrapping |
| `test/unit/requests.test.js` | list body builders, pagination and numeric filter validation |
| `test/unit/tasks.test.js` | task watch invalid interval and timeout |
| `test/unit/uploads.test.js` | missing `fileUrl`, upload details, file-size formatting |
| `test/unit/video-run.test.js` | `video run` stops on failed tasks and scopes video lookup by task id |
| `test/unit/end-to-end-publish.test.js` | workflow create/watch/list/publish/data flow, missing publish id, failed task stop |
| `test/unit/publish-run.test.js` | `publish run` explicitly enables created strategy |
| `test/cli/validate-video-create.test.js` | video payload VEO/SORA validation |
| `test/commands/auth.test.js` | auth status and auth test orchestration |
| `test/commands/accounts.test.js` | account list/shoppable parameters and pagination failures |
| `test/commands/templates.test.js` | labels list, template get validation/output |
| `test/commands/publish.test.js` | products body handling, pagination validation, strategy create/enable |
| `test/commands/workflow.test.js` | `workflow publish` input/output orchestration |
| `test/commands/misc.test.js` | raw path normalization, completion output |

## Failure Exit Codes

| Code | Meaning |
| --- | --- |
| `1` | usage error, invalid local input, invalid JSON, invalid config |
| `2` | missing API key |
| `3` | unauthorized API response |
| `4` | request, transport, timeout, upload, or API envelope failure |
| `5` | expected response data missing, task/resource not found, failed workflow task |
| `6` | task watch timeout |

## Local Matrix

### Boot And Help

| ID | Scenario | Command | Expected |
| --- | --- | --- | --- |
| BOOT-001 | Root help | `node bin/beervid.js --help` | Prints command list |
| BOOT-002 | No args | `node bin/beervid.js` | Prints root help |
| BOOT-003 | Unknown command | `node bin/beervid.js unknown` | Exit `1`, `Unknown command` |
| BOOT-004 | Subcommand help | `node bin/beervid.js video --help` | Prints video usage |
| BOOT-005 | Completion zsh | `node bin/beervid.js completion zsh` | Prints zsh completion |
| BOOT-006 | Completion bash | `node bin/beervid.js completion bash` | Prints bash completion |
| BOOT-007 | Completion fish | `node bin/beervid.js completion fish` | Prints fish completion |

### Config And Auth

| ID | Scenario | Command/Input | Expected |
| --- | --- | --- | --- |
| AUTH-001 | Set key | `auth set-key <key> --config-path tmp/config.json` | Writes config, masks nothing in file |
| AUTH-002 | Status configured | `auth status --config-path tmp/config.json` | Shows configured state and masked key |
| AUTH-003 | Status empty | no config | Shows not configured |
| AUTH-004 | Clear key | `auth clear --config-path tmp/config.json` | Removes `api_key` |
| AUTH-005 | Missing key for protected command | `accounts list` without key | Exit `2` |
| AUTH-006 | `auth check` | valid key | `GET /check`, JSON/text output valid |
| AUTH-007 | `auth profile` | valid key | `GET /profile`, profile fields shown |
| AUTH-008 | `auth test` | valid key | Calls `/check` and `/profile` |
| AUTH-009 | Invalid config JSON | malformed config file | Exit `1` |
| AUTH-010 | Invalid timeout | `--timeout abc` | Exit `1` |

### Accounts

| ID | Scenario | Input | Expected |
| --- | --- | --- | --- |
| ACC-001 | List defaults | `accounts list` | `GET /tt-accounts`, `current=1`, `size=10`, `shoppableType=ALL` |
| ACC-002 | List filters | `--keyword shop --shoppable-type TT --current 2 --size 5` | Query forwards filters, pagination numeric |
| ACC-003 | Shoppable defaults | `accounts shoppable` | `shoppableType=TTS`, `current=1`, `size=50` |
| ACC-004 | Invalid current | `--current abc` | Exit `1` |
| ACC-005 | Invalid size | `--size abc` | Exit `1` |
| ACC-006 | Empty result | API returns no records | Text says `0 accounts found` |

### Labels And Templates

| ID | Scenario | Input | Expected |
| --- | --- | --- | --- |
| LABEL-001 | Labels list | `labels list` | `GET /video-create/labels` |
| LABEL-002 | Bad labels subcommand | `labels get` | Prints labels help |
| TPL-001 | Templates list | `templates list` | `GET /templates/options` |
| TPL-002 | Template get | `templates get --id <id>` | `GET /templates/{id}` |
| TPL-003 | Missing template id | `templates get` | Exit `1` |
| TPL-004 | Nested template data | API wraps in `data.data` | Text fields still render |

### Uploads

| ID | Scenario | Input | Expected |
| --- | --- | --- | --- |
| UPL-001 | JPG upload | `video upload --path a.jpg --type image` | POST multipart, returns `file_url` and size |
| UPL-002 | PNG upload | valid `.png` | Success |
| UPL-003 | MP4 upload | valid `.mp4` | Success |
| UPL-004 | MOV upload | valid `.mov` | Success |
| UPL-005 | MP3 upload | valid `.mp3` | Success |
| UPL-006 | WAV upload | valid `.wav` | Success |
| UPL-007 | Missing path | no `--path` | Exit `1` |
| UPL-008 | Missing type | no `--type` | Exit `1` |
| UPL-009 | Invalid type | `--type doc` | Exit `1` |
| UPL-010 | Missing file | nonexistent path | Exit `1` |
| UPL-011 | Directory path | directory instead of file | Exit `1` |
| UPL-012 | Bad extension | image `.gif`, video `.avi`, audio `.aac` | Exit `1` |
| UPL-013 | Oversized file | image >7MB, video >10MB, audio >5MB | Exit `1` |
| UPL-014 | API envelope failure | `code != 0` or `success=false` | Exit `4` |
| UPL-015 | Success without `fileUrl` | upload response lacks URL | Exit `5` |

### Video Create Validation

| ID | Scenario | Expected |
| --- | --- | --- |
| VC-001 | Payload is not object | Exit `1` |
| VC-002 | Missing `techType` | Pass-through, API decides |
| VC-003 | Invalid `techType` | Exit `1` |
| VC-004 | Empty or missing `fragmentList` when `techType` set | Exit `1` |
| VC-005 | Empty `videoContent` | Exit `1` |
| VC-006 | `videoContent` contains whitespace/Chinese/Markdown | Preserved verbatim |
| VC-007 | `useCoverFrame` not boolean | Exit `1` |
| VC-008 | `segmentCount` not integer | Exit `1` |
| VC-009 | `spliceMethod` not `SPLICE` or `LONG_TAKE` | Exit `1` |
| VC-010 | VEO `segmentCount` outside 1-4 | Exit `1` |
| VC-011 | VEO single-fragment `segmentCount=2` without confirmation | Exit `1` |
| VC-012 | VEO single-fragment `segmentCount=2` with `--confirm-veo-two-8s` | Pass |
| VC-013 | VEO product images >3 | Exit `1` |
| VC-014 | VEO portrait images >1 | Exit `1` |
| VC-015 | VEO `9:16` portrait image with `useCoverFrame=false` | Exit `1` |
| VC-016 | VEO `segmentCount=1` with `LONG_TAKE` | Exit `1` |
| VC-017 | SORA family product images >1 | Exit `1` |
| VC-018 | SORA family nine-grid images >9 | Exit `1` |
| VC-019 | SORA family product/nine-grid only one side present | Exit `1` |
| VC-020 | SORA family portrait images present | Exit `1` |
| VC-021 | SORA family `useCoverFrame=true` | Exit `1` |
| VC-022 | SORA family `segmentCount != 1` | Exit `1` |
| VC-023 | SORA family multiple fragments | Exit `1` |
| VC-024 | SORA family `LONG_TAKE` | Exit `1` |
| VC-025 | Local asset strings | Uploaded and replaced by returned `fileUrl` |
| VC-026 | Nested asset objects | `fileUrl`, `fileURL`, `url`, and `src` local paths are uploaded and replaced in place |
| VC-027 | Existing remote/CDN asset URLs | Left unchanged by default, no upload call |
| VC-028 | Remote asset re-upload | With `--upload-remote-assets`, remote URLs are downloaded, validated, uploaded, and replaced |

### Video Commands And Workflows

| ID | Scenario | Command/Input | Expected |
| --- | --- | --- | --- |
| VID-001 | Create task | `video create --file payload.json` | POST `/video-create`, output task id |
| VID-002 | Create from stdin | `--stdin` | Reads JSON from stdin |
| VID-003 | Invalid JSON | bad file/stdin | Exit `1` |
| VID-004 | Tasks list | `video tasks list` | GET `/video-create/tasks` |
| VID-005 | Tasks get found | `--task-id` | Returns matching task |
| VID-006 | Tasks get missing id | no `--task-id` | Exit `1` |
| VID-007 | Tasks get not found | no matching task | Exit `5` |
| VID-008 | Tasks watch success | terminal success/completed | Exit `0` |
| VID-009 | Tasks watch failed | terminal failed/error/canceled | Text says failed, exit code `5` |
| VID-010 | Tasks watch timeout | non-terminal until max attempts | Exit `6` |
| VID-011 | Tasks watch invalid interval/max attempts | bad numeric flags | Exit `1` |
| VID-012 | Video list default | no body file | POST `/videos/library/list`, validated pagination |
| VID-013 | Video list filters | task ids, strategy ids, business ids, labels, audit status | Body contains normalized arrays/numbers |
| VID-014 | Video publish | body file | POST `/videos/library/publish` |
| VID-015 | Video data get | `--id <publish_task_id>` | GET `/video/publish-task/{id}` |
| VID-016 | Video data missing id | no `--id` | Exit `1` |
| VID-017 | `video run` success | task success | Create, watch, list with current `task_id`, output generated video id |
| VID-018 | `video run` failed task | task failed | Exit `5`, does not call video list, does not output unrelated video id |
| VID-019 | `video run` list empty | success task but no scoped video | `latest_video_id: unknown` |
| VID-020 | `video publish-run` success | create + publish body | Uses current task id to resolve video before publish |
| VID-021 | `video publish-run` failed task | failed watch | Exit `5`, does not publish |

### Publish Commands And Workflows

| ID | Scenario | Command/Input | Expected |
| --- | --- | --- | --- |
| PUB-001 | Products with file | `publish products --file body.json` | POST body unchanged |
| PUB-002 | Products with creator open id | `--creator-user-open-id` | Builds body with validated pagination |
| PUB-003 | Products with account id | `--account-id` | Resolves `creatorUserOpenId` from `/tt-accounts` |
| PUB-004 | Products missing creator/account | no file and no ids | Exit `1` |
| PUB-005 | Products invalid pagination | `--current abc` or `--size abc` | Exit `1` |
| PUB-006 | Strategy list | filters | POST `/strategies/list`, validates pagination/status |
| PUB-007 | Strategy get | `--id` | GET `/strategies/{id}` |
| PUB-008 | Strategy get missing id | no id | Exit `1` |
| PUB-009 | Strategy create | file body or `strategyCreateDTO` wrapper | POST normalized body |
| PUB-010 | Strategy enable | `--id` | POST `/strategies/{id}/toggle` with `enable: true` |
| PUB-011 | Strategy disable | `--id` | POST `/strategies/{id}/toggle` with `enable: false` |
| PUB-012 | Strategy delete | `--id` | DELETE `/strategies/{id}` |
| PUB-013 | Missing id for enable/disable/delete | no id | Exit `1` |
| PUB-014 | Records list | filters/body file | POST `/send-records/list`, validates pagination/status |
| PUB-015 | `publish run` success | strategy body | Create strategy then explicitly enable with `true` |
| PUB-016 | `publish run` missing strategy id | create response lacks id | Exit `5` |

Manual strategy publish verification: after enabling a strategy, wait 5-10 minutes after the target publish time configured in `pushConfig`, then query `publish records --strategy-id <id>` before disabling or deleting the strategy.

### End-To-End Workflow

| ID | Scenario | Expected |
| --- | --- |
| WF-001 | `workflow publish` valid inputs | Reads video file and publish file, creates video, watches task, lists videos scoped by current task id, publishes, fetches publish task |
| WF-002 | Missing `--file` | Exit `1` |
| WF-003 | Missing `--publish-file` | Exit `1` |
| WF-004 | Video task failed | Exit `5`, no video list, no publish |
| WF-005 | Video list empty | Exit `5`, no publish |
| WF-006 | Publish response lacks publish task id | Exit `5` unless `--skip-publish-data` |
| WF-007 | `--skip-publish-data` | Skips final GET and reports publish task as unknown if absent |
| WF-008 | `--video-id` supplied | Uses supplied video id instead of first scoped list record |

### Raw And Completion

| ID | Scenario | Command/Input | Expected |
| --- | --- | --- | --- |
| RAW-001 | Raw get | `raw get templates/options` | Path normalized to `/templates/options`, JSON output |
| RAW-002 | Raw post | `raw post /send-records/list --file body.json` | Sends parsed body |
| RAW-003 | Raw put/patch/delete | method accepted | Sends method, optional body except GET |
| RAW-004 | Missing path | no path | Exit `1` |
| RAW-005 | Invalid method | unsupported method | Exit `1` |
| CMP-001 | Completion zsh | `completion zsh` | Prints script |
| CMP-002 | Completion bash | `completion bash` | Prints script including `workflow` |
| CMP-003 | Completion fish | `completion fish` | Prints script including `workflow` |
| CMP-004 | Invalid completion shell | unsupported shell | Prints completion help |

## Production Manual Matrix

Use `docs/production-test-plan.md` for commands and materials. Minimum production pass set:

| Area | Required pass |
| --- | --- |
| Auth | `auth test`, `auth check`, `auth profile` |
| Read-only | accounts, labels, templates, products, strategy list, records, video list |
| Raw | `/check`, `/profile`, `/templates/options`, `/shop-products/list`, `/send-records/list` |
| Upload | image, video, audio all return `fileUrl` |
| Video | create returns task id, watch succeeds, list resolves video by task id |
| Publish | publish returns task id or documented success response, data get works |
| Workflow | `workflow publish` does not use unrelated videos and stops on failed tasks |
| Strategy | create, get, enable, disable, delete |
| Failure | invalid key, missing key, invalid pagination, missing file, bad upload type |

## Release Checklist

Before bumping and publishing:

```bash
npm run check:syntax
npm test
npm run pack:check
git status -sb
npm view beervid-cli version
```

After publishing:

```bash
npm view beervid-cli version
npm view beervid-cli dist.tarball
```
