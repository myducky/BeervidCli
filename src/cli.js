const { loadConfig, saveApiKey, clearApiKey, getConfigPath } = require("./config");
const {
  findDeepValue,
  findEnabledState,
  findName,
  findStatus,
  findTaskId,
  formatEnabledState,
  normalizeStrategyPayload,
  normalizeVideoPublishPayload,
} = require("./core");
const { apiRequest, maskApiKey } = require("./http");
const { handleAuth } = require("./commands/auth");
const { handleAccounts } = require("./commands/accounts");
const { handleLabels, handleTemplates } = require("./commands/templates");
const { handleVideo, handleVideoData, handleVideoTasks } = require("./commands/video");
const { handlePublish, handlePublishStrategy } = require("./commands/publish");
const { handleRaw, handleCompletion } = require("./commands/misc");
const { runVideoWorkflow } = require("./workflows/video-run");
const { runPublishWorkflow } = require("./workflows/publish-run");
const {
  buildSendRecordsRequest,
  buildStrategyListRequest,
  buildVideoLibraryListRequest,
  copyOptionalFlag,
} = require("./requests");
const {
  formatTaskStatus,
  getTask: getTaskCore,
  isSuccessStatus,
  watchTask: watchTaskCore,
} = require("./tasks");
const {
  mimeTypeForFileName,
  uploadLocalFile,
  validateUploadFile,
} = require("./uploads");
const {
  prepareVideoCreatePayload: prepareVideoCreatePayloadCore,
  validateVideoCreatePayload,
} = require("./video-payload");
const {
  printHelp,
  printSubcommandHelp,
  parseArgs,
  readJsonInput,
  formatOutput,
  fail,
  sleep,
} = require("./utils");
const { parsePositiveInteger } = require("./validation");

async function main(argv) {
  const parsed = parseArgs(argv);
  if (parsed.positionals.length === 0) {
    printHelp();
    return;
  }

  const [command, subcommand, ...rest] = parsed.positionals;
  if (parsed.flags.help) {
    const topic = [command, subcommand].filter(Boolean).join(".");
    if (topic) {
      printSubcommandHelp(topic);
    } else {
      printHelp();
    }
    return;
  }

  const config = loadConfig(parsed.flags);

  switch (command) {
    case "auth":
      return handleAuth(subcommand, rest, parsed.flags, config, commandDeps);
    case "accounts":
      return handleAccounts(subcommand, parsed.flags, config, commandDeps);
    case "labels":
      return handleLabels(subcommand, parsed.flags, config, commandDeps);
    case "templates":
      return handleTemplates(subcommand, parsed.flags, config, commandDeps);
    case "video":
      return handleVideo(subcommand, rest, parsed.flags, config, commandDeps);
    case "publish":
      return handlePublish(subcommand, rest, parsed.flags, config, commandDeps);
    case "raw":
      return handleRaw(subcommand, rest, parsed.flags, config, commandDeps);
    case "completion":
      return handleCompletion(subcommand, commandDeps);
    default:
      fail(`Unknown command: ${command}`, 1);
  }
}

const commandDeps = {
  apiRequest,
  buildSendRecordsRequest,
  buildStrategyListRequest,
  buildVideoLibraryListRequest,
  clearApiKey,
  copyOptionalFlag,
  fail,
  findDeepValue,
  findEnabledState,
  findName,
  findRecords,
  findStatus,
  findStrategyId,
  findTaskId,
  formatEnabledState,
  formatOutput,
  formatTaskStatus,
  getTask,
  handlePublishStrategy,
  handleVideoData,
  handleVideoTasks,
  isSuccessStatus,
  maskApiKey,
  mimeTypeForFileName,
  normalizeStrategyPayload,
  normalizeVideoPublishPayload,
  prepareVideoCreatePayload,
  printSubcommandHelp,
  readJsonInput,
  requireApiKey,
  resolveCreatorUserOpenId,
  runPublishWorkflow,
  runVideoWorkflow,
  saveApiKey,
  toggleStrategy,
  uploadLocalFile,
  validateUploadFile,
  watchTask,
  getConfigPath,
};

function requireApiKey(config) {
  if (!config.apiKey) {
    fail("Missing API key. Run: beervid auth set-key <api_key>", 2);
  }
}

function prepareVideoCreatePayload(config, body, flags = {}) {
  return prepareVideoCreatePayloadCore(config, body, flags, apiRequest);
}

async function getTask(config, taskId, flags) {
  return getTaskCore({
    config,
    taskId,
    flags,
    apiRequest,
    findRecords,
    copyOptionalFlag,
  });
}

async function watchTask(config, taskId, flags) {
  return watchTaskCore({
    config,
    taskId,
    flags,
    getTask,
    sleep,
  });
}

async function toggleStrategy(config, id, enable) {
  return apiRequest(config, {
    method: "POST",
    path: `/strategies/${id}/toggle`,
    body: { enable },
  });
}

function findRecords(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.records)) return data.records;
  if (data.data) return findRecords(data.data);
  return [];
}

function findStrategyId(data) {
  return findDeepValue(data, ["strategyId", "strategy_id", "id"]);
}

async function resolveCreatorUserOpenId(config, flags) {
  if (flags["creator-user-open-id"]) return flags["creator-user-open-id"];
  if (!flags["account-id"]) {
    fail("Usage: beervid publish products --creator-user-open-id <open_id> [--current <n>] [--size <n>]", 1);
  }

  const response = await apiRequest(config, {
    method: "GET",
    path: "/tt-accounts",
    query: {
      current: 1,
      size: parsePositiveInteger(flags.size, "--size", 100),
      shoppableType: "ALL",
    },
  });
  const record = findRecords(response.data).find((item) => (
    item.businessId === flags["account-id"] || item.id === flags["account-id"] || item.accountId === flags["account-id"]
  ));
  if (!record || !record.creatorUserOpenId) {
    fail(`Unable to resolve creatorUserOpenId for account: ${flags["account-id"]}`, 5);
  }
  return record.creatorUserOpenId;
}

module.exports = {
  main,
  validateVideoCreatePayload,
};
