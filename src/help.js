const HELP_TOPICS = {
  root: [
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
  ],
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
    "  beervid video tasks watch --task-id <task_id> [--initial-wait <seconds>]",
    "  beervid video list [--current <n>] [--size <n>]",
    "  beervid video publish --file <payload.json>",
    "  beervid video data get --id <video_id>",
    "  beervid video run --file <payload.json> [--initial-wait <seconds>] [--confirm-veo-two-8s]",
    "",
    "Video Create Notes:",
    "  in this system, techType=veo means cinematic style",
    "  techType=veo  => segmentCount 1-4 maps to 8s/16s/24s/32s",
    "  veo single-fragment 16s means two internal 8s chapters; require explicit confirmation via --confirm-veo-two-8s",
    "  techType=sora/sora_azure/sora_h_pro/sora_aio => realistic style path, single fragment only, and one fragment corresponds to one 15s generation",
    "  fragmentList length matches the number of UI chapters",
    "  videoScale accepts 9:16 or 16:9",
    "  portraitImages is veo-only, max 1 image, and requires useCoverFrame=true for 9:16",
    "  productReferenceImages max: veo=3, sora-family=1",
    "  nineGridImages max: sora-family=9, and it must be paired with productReferenceImages",
    "  LONG_TAKE is not allowed for sora-family or veo segmentCount=1",
    "  local paths and remote URLs in productReferenceImages/nineGridImages/portraitImages/bgmList/headVideo/endVideo are auto-uploaded first",
    "  fragmentList[].videoContent is sent verbatim; the CLI must not rewrite, translate, trim, or summarize the user's prompt text",
    "  generation often takes about 5-10 minutes; prefer --initial-wait 300 before the first status check instead of tight immediate polling",
  ],
  "video.tasks": [
    "Usage:",
    "  beervid video tasks get --task-id <task_id>",
    "  beervid video tasks list [--status <value>]",
    "  beervid video tasks watch --task-id <task_id> [--initial-wait <seconds>]",
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

function getHelpLines(topic) {
  if (!topic) return HELP_TOPICS.root;
  return HELP_TOPICS[topic] || ["No help available."];
}

function printHelp(topic) {
  process.stdout.write(`${getHelpLines(topic).join("\n")}\n`);
}

module.exports = {
  getHelpLines,
  printHelp,
};
