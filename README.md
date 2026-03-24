# Beervid CLI

First-pass zero-dependency CLI for the Beervid Open API.

## Quick Start

```bash
node ./bin/beervid.js auth set-key YOUR_API_KEY
node ./bin/beervid.js auth test
node ./bin/beervid.js accounts list
node ./bin/beervid.js templates list
node ./bin/beervid.js video create --file ./examples/video-create.json
node ./bin/beervid.js video tasks get --task-id task_xxx
node ./bin/beervid.js video tasks watch --task-id task_xxx
node ./bin/beervid.js video list
node ./bin/beervid.js publish strategy create --file ./examples/publish-strategy-template.json
node ./bin/beervid.js publish strategy enable --id strategy_xxx
node ./bin/beervid.js publish records
```

## Install Locally

```bash
npm link
```

Then run:

```bash
beervid --help
```

## Notes

- `video create`, `video run`, `publish strategy create`, and `publish run` accept JSON files and largely pass them through to the API.
- `video tasks get` queries the task list endpoint and matches by `task_id`.
- `video tasks watch` polls until the task reaches a terminal state.
- `video list` queries the video library and should be treated as the final source of generated videos.
