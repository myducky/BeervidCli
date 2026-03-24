const fs = require("fs");

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
      continue;
    }
    if (arg === "--json" || arg === "--verbose" || arg === "--quiet" || arg === "--stdin") {
      flags[arg.slice(2)] = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
      continue;
    }
    positionals.push(arg);
  }

  return { positionals, flags };
}

function readJsonInput(flags, options = {}) {
  if (flags.file) {
    return JSON.parse(fs.readFileSync(flags.file, "utf8"));
  }
  if (flags.stdin) {
    const stdin = fs.readFileSync(0, "utf8");
    return stdin ? JSON.parse(stdin) : {};
  }
  if (options.optional) return undefined;
  fail("Missing JSON input. Use --file <path> or --stdin.", 1);
}

function formatOutput({ flags, command, data, textLines = [] }) {
  if (flags.json) {
    process.stdout.write(`${JSON.stringify({ ok: true, command, data }, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${textLines.join("\n")}\n`);
}

function printHelp() {
  process.stdout.write(
    [
      "Beervid CLI",
      "",
      "Usage:",
      "  beervid <command> [subcommand] [options]",
      "",
      "Commands:",
      "  auth        Manage API key and connection",
      "  accounts    Query TikTok account information",
      "  labels      Query video creation labels",
      "  templates   Query video templates",
      "  video       Manage video generation tasks and library",
      "  publish     Manage publishing workflows and records",
      "  raw         Call raw Beervid API endpoints",
      "  completion  Generate shell completion scripts",
      "",
      "Global Options:",
      "  --json",
      "  --verbose",
      "  --quiet",
      "  --timeout <ms>",
      "  --api-key <key>",
      "  --base-url <url>",
      "",
    ].join("\n"),
  );
}

function printSubcommandHelp(topic) {
  const help = {
    auth: [
      "Usage:",
      "  beervid auth set-key <api_key>",
      "  beervid auth status",
      "  beervid auth test",
      "  beervid auth check",
      "  beervid auth profile",
      "  beervid auth clear",
    ],
    accounts: [
      "Usage:",
      "  beervid accounts list [--shoppable-type <ALL|TT|TTS>] [--keyword <text>] [--current <n>] [--size <n>]",
      "  beervid accounts shoppable [--keyword <text>] [--current <n>] [--size <n>]",
    ],
    labels: [
      "Usage:",
      "  beervid labels list",
    ],
    templates: [
      "Usage:",
      "  beervid templates list",
      "  beervid templates get --id <template_id>",
    ],
    video: [
      "Usage:",
      "  beervid video create --file <payload.json>",
      "  beervid video upload --path <file> --type <image|video|audio>",
      "  beervid video tasks get --task-id <task_id>",
      "  beervid video tasks list [--status <value>]",
      "  beervid video tasks watch --task-id <task_id>",
      "  beervid video list [--current <n>] [--size <n>]",
      "  beervid video publish --file <payload.json>",
      "  beervid video data get --id <publish_task_id>",
      "  beervid video run --file <payload.json>",
      "",
      "Video Create Notes:",
      "  techType=veo  => segmentCount 1-4 maps to 8s/16s/24s/32s",
      "  techType=sora/sora_azure/sora_h_pro/sora_aio => segmentCount must be 1",
      "  fragmentList length matches the number of UI chapters",
      "  videoScale accepts 9:16 or 16:9",
      "  portraitImages is veo-only, max 1 image, and requires useCoverFrame=true for 9:16",
      "  productReferenceImages max: veo=3, sora-family=1",
      "  LONG_TAKE is not allowed for sora-family or veo segmentCount=1",
      "  local paths in productReferenceImages/nineGridImages/portraitImages/bgmList/headVideo/endVideo are auto-uploaded",
    ],
    "video.tasks": [
      "Usage:",
      "  beervid video tasks get --task-id <task_id>",
      "  beervid video tasks list [--status <value>]",
      "  beervid video tasks watch --task-id <task_id>",
    ],
    publish: [
      "Usage:",
      "  beervid publish products --creator-user-open-id <open_id>",
      "  beervid publish strategy list [--current <n>] [--size <n>]",
      "  beervid publish strategy get --id <strategy_id>",
      "  beervid publish strategy create --file <strategy.json>",
      "  beervid publish strategy enable --id <strategy_id>",
      "  beervid publish strategy disable --id <strategy_id>",
      "  beervid publish strategy delete --id <strategy_id>",
      "  beervid publish records",
      "  beervid publish run --file <strategy.json>",
    ],
    "publish.strategy": [
      "Usage:",
      "  beervid publish strategy list [--name <text>] [--status <0|1>] [--business-id <id>] [--current <n>] [--size <n>]",
      "  beervid publish strategy get --id <strategy_id>",
      "  beervid publish strategy create --file <strategy.json>",
      "  beervid publish strategy enable --id <strategy_id>",
      "  beervid publish strategy disable --id <strategy_id>",
      "  beervid publish strategy delete --id <strategy_id>",
    ],
    raw: [
      "Usage:",
      "  beervid raw <get|post|put|patch|delete> <path> [--file payload.json]",
    ],
    completion: [
      "Usage:",
      "  beervid completion zsh",
      "  beervid completion bash",
      "  beervid completion fish",
    ],
  };
  const lines = help[topic] || ["No help available."];
  process.stdout.write(`${lines.join("\n")}\n`);
}

function fail(message, exitCode = 1) {
  const error = new Error(message);
  error.exitCode = exitCode;
  throw error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  parseArgs,
  readJsonInput,
  formatOutput,
  printHelp,
  printSubcommandHelp,
  fail,
  sleep,
};
