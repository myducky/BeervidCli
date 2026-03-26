const fs = require("fs");
const path = require("path");
const { loadConfig, saveApiKey, clearApiKey, getConfigPath } = require("./config");
const {
  findDeepValue,
  findEnabledState,
  findName,
  findStatus,
  findTaskId,
  formatEnabledState,
  normalizeStrategyPayload,
  normalizeTaskStatus,
  normalizeVideoCreatePayload,
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
  printHelp,
  printSubcommandHelp,
  parseArgs,
  readJsonInput,
  formatOutput,
  fail,
  sleep,
} = require("./utils");

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
  fs,
  getTask,
  handlePublishStrategy,
  handleVideoData,
  handleVideoTasks,
  isSuccessStatus,
  maskApiKey,
  mimeTypeForFileName,
  normalizeStrategyPayload,
  normalizeVideoPublishPayload,
  path,
  prepareVideoCreatePayload,
  printSubcommandHelp,
  readJsonInput,
  requireApiKey,
  resolveCreatorUserOpenId,
  runPublishWorkflow,
  runVideoWorkflow,
  saveApiKey,
  toggleStrategy,
  validateUploadFile,
  watchTask,
  getConfigPath,
};

function requireApiKey(config) {
  if (!config.apiKey) {
    fail("Missing API key. Run: beervid auth set-key <api_key>", 2);
  }
}

function buildListRequest(flags) {
  const request = {
    current: Number(flags.current || 1),
    size: Number(flags.size || 10),
  };
  if (flags["task-mode"]) request.taskMode = flags["task-mode"];
  return request;
}

function validateVideoCreatePayload(body) {
  const payload = normalizeVideoCreatePayload(body);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail("Video create payload must be a JSON object.", 1);
  }

  const { techType, fragmentList, videoScale } = payload;
  if (!techType) return payload;
  if (!["veo", "sora", "sora_azure", "sora_h_pro", "sora_aio"].includes(techType)) {
    fail("video create techType must be one of: veo, sora, sora_azure, sora_h_pro, sora_aio", 1);
  }

  if (!Array.isArray(fragmentList) || fragmentList.length === 0) {
    fail("video create fragmentList must be a non-empty array.", 1);
  }

  const isSoraFamily = techType !== "veo";

  fragmentList.forEach((fragment, index) => {
    const prefix = `fragmentList[${index}]`;
    if (!fragment || typeof fragment !== "object" || Array.isArray(fragment)) {
      fail(`${prefix} must be an object.`, 1);
    }
    if (typeof fragment.videoContent !== "string" || fragment.videoContent.trim() === "") {
      fail(`${prefix}.videoContent is required.`, 1);
    }
    if (typeof fragment.useCoverFrame !== "boolean") {
      fail(`${prefix}.useCoverFrame must be true or false.`, 1);
    }
    if (!Number.isInteger(fragment.segmentCount)) {
      fail(`${prefix}.segmentCount must be an integer.`, 1);
    }
    if (!["SPLICE", "LONG_TAKE"].includes(fragment.spliceMethod)) {
      fail(`${prefix}.spliceMethod must be SPLICE or LONG_TAKE.`, 1);
    }

    const productReferenceImages = Array.isArray(fragment.productReferenceImages) ? fragment.productReferenceImages : [];
    const nineGridImages = Array.isArray(fragment.nineGridImages) ? fragment.nineGridImages : [];
    const portraitImages = Array.isArray(fragment.portraitImages) ? fragment.portraitImages : [];

    if (techType === "veo" && (fragment.segmentCount < 1 || fragment.segmentCount > 4)) {
      fail(`${prefix}.segmentCount must be 1-4 for veo (1=8s, 2=16s, 3=24s, 4=32s).`, 1);
    }

    if (techType === "veo") {
      if (productReferenceImages.length > 3) {
        fail(`${prefix}.productReferenceImages allows at most 3 images for veo.`, 1);
      }
      if (portraitImages.length > 1) {
        fail(`${prefix}.portraitImages allows at most 1 image for veo.`, 1);
      }
      if (videoScale === "9:16" && portraitImages.length > 0 && fragment.useCoverFrame !== true) {
        fail(`${prefix}.useCoverFrame must be true for veo when videoScale is 9:16 and portraitImages is provided.`, 1);
      }
      if (fragment.segmentCount === 1 && fragment.spliceMethod === "LONG_TAKE") {
        fail(`${prefix}.spliceMethod LONG_TAKE is not supported for veo when segmentCount is 1.`, 1);
      }
    }

    if (isSoraFamily) {
      if (productReferenceImages.length > 1) {
        fail(`${prefix}.productReferenceImages allows at most 1 image for ${techType}.`, 1);
      }
      if (nineGridImages.length > 9) {
        fail(`${prefix}.nineGridImages allows at most 9 images for ${techType}.`, 1);
      }
      if ((nineGridImages.length > 0 && productReferenceImages.length === 0) || (productReferenceImages.length > 0 && nineGridImages.length === 0)) {
        fail(`${prefix}.nineGridImages and productReferenceImages must both be provided or both be empty for ${techType}.`, 1);
      }
      if (portraitImages.length > 0) {
        fail(`${prefix}.portraitImages must be empty for ${techType}.`, 1);
      }
      if (fragment.useCoverFrame === true) {
        fail(`${prefix}.useCoverFrame must be false for ${techType}.`, 1);
      }
      if (fragment.segmentCount !== 1) {
        fail(`${prefix}.segmentCount must be 1 for ${techType}.`, 1);
      }
      if (fragment.spliceMethod === "LONG_TAKE") {
        fail(`${prefix}.spliceMethod LONG_TAKE is not supported for ${techType}.`, 1);
      }
    }
  });

  return payload;
}

async function prepareVideoCreatePayload(config, body, flags = {}) {
  const payload = validateVideoCreatePayload(body);
  const prepared = cloneJson(payload);

  await replaceUploadFieldWithUrls(config, prepared, "bgmList", "audio", flags);
  await replaceUploadFieldWithUrl(config, prepared, "headVideo", "video", flags);
  await replaceUploadFieldWithUrl(config, prepared, "endVideo", "video", flags);

  if (Array.isArray(prepared.fragmentList)) {
    for (const fragment of prepared.fragmentList) {
      if (!fragment || typeof fragment !== "object") continue;
      await replaceUploadFieldWithUrls(config, fragment, "productReferenceImages", "image", flags);
      await replaceUploadFieldWithUrls(config, fragment, "nineGridImages", "image", flags);
      await replaceUploadFieldWithUrls(config, fragment, "portraitImages", "image", flags);
    }
  }

  return prepared;
}

async function replaceUploadFieldWithUrls(config, target, field, fileType, flags = {}) {
  if (!Array.isArray(target[field])) return;
  const uploaded = [];
  for (const item of target[field]) {
    uploaded.push(await maybeUploadPayloadAsset(config, item, fileType, flags));
  }
  target[field] = uploaded;
}

async function replaceUploadFieldWithUrl(config, target, field, fileType, flags = {}) {
  if (target[field] == null || target[field] === "") return;
  target[field] = await maybeUploadPayloadAsset(config, target[field], fileType, flags);
}

async function maybeUploadPayloadAsset(config, value, fileType, flags = {}) {
  if (typeof value !== "string") return value;
  const filePath = resolveExistingLocalPath(value);
  if (filePath) {
    if (!flags.quiet) {
      console.error(`Uploading ${fileType}: ${filePath}`);
    }
    return uploadLocalFile(config, filePath, fileType);
  }
  if (isHttpUrl(value)) {
    if (!flags.quiet) {
      console.error(`Uploading ${fileType} from URL: ${value}`);
    }
    return uploadRemoteFile(config, value, fileType);
  }
  return value;
}

function resolveExistingLocalPath(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (/^https?:\/\//i.test(value)) return null;
  const candidates = [path.resolve(value)];
  if (value.startsWith("~/")) {
    candidates.push(path.join(require("os").homedir(), value.slice(2)));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

async function uploadLocalFile(config, filePath, fileType) {
  const buffer = fs.readFileSync(filePath);
  validateUploadFile(filePath, fileType);
  return uploadFileContents(config, buffer, path.basename(filePath), fileType, filePath, mimeTypeForFileName(path.basename(filePath), fileType));
}

async function uploadRemoteFile(config, sourceUrl, fileType) {
  let response;
  try {
    response = await fetch(sourceUrl);
  } catch (error) {
    const wrapped = new Error(`Failed to download remote ${fileType}: ${error.message}`);
    wrapped.exitCode = 4;
    throw wrapped;
  }
  if (!response.ok) {
    fail(`Failed to download remote ${fileType}: status ${response.status}`, 4);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = inferRemoteFileName(sourceUrl, response.headers.get("content-type"), fileType);
  validateUploadBuffer(buffer, fileName, fileType);
  return uploadFileContents(config, buffer, fileName, fileType, sourceUrl, mimeTypeForRemote(response.headers.get("content-type"), fileName, fileType));
}

async function uploadFileContents(config, buffer, fileName, fileType, sourceLabel, mimeType) {
  const formData = new FormData();
  formData.set("file", new Blob([buffer], { type: mimeType }), fileName);
  formData.set("fileType", fileType);
  const response = await apiRequest(config, {
    method: "POST",
    path: "/video-create/upload",
    formData,
  });
  if (response.data && (response.data.error === true || response.data.success === false || Number(response.data.code) !== 0)) {
    fail(response.data.message || `Upload failed for: ${sourceLabel}`, 4);
  }
  const fileUrl = findDeepValue(response.data, ["fileUrl", "url"]);
  if (!fileUrl) {
    fail(`Upload succeeded but no fileUrl was returned for: ${sourceLabel}`, 5);
  }
  return fileUrl;
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

function inferRemoteFileName(sourceUrl, contentType, fileType) {
  const preferredExtension = extensionForContentType(contentType, fileType);
  try {
    const parsed = new URL(sourceUrl);
    const rawName = path.basename(parsed.pathname);
    const cleanedName = rawName && rawName !== "/" ? rawName : `${fileType}-upload`;
    const currentExtension = path.extname(cleanedName).toLowerCase();
    if (currentExtension && isSupportedUploadExtension(currentExtension, fileType)) return cleanedName;
    const baseName = currentExtension ? cleanedName.slice(0, -currentExtension.length) : cleanedName;
    return `${baseName}${preferredExtension}`;
  } catch (_error) {
    return `${fileType}-upload${preferredExtension}`;
  }
}

function extensionForContentType(contentType, fileType) {
  const normalized = String(contentType || "").toLowerCase();
  if (normalized.includes("jpeg")) return ".jpg";
  if (normalized.includes("png")) return ".png";
  if (normalized.includes("mp4")) return ".mp4";
  if (normalized.includes("quicktime")) return ".mov";
  if (normalized.includes("mpeg")) return ".mp3";
  if (normalized.includes("wav")) return ".wav";
  const defaults = {
    image: ".jpg",
    video: ".mp4",
    audio: ".mp3",
  };
  return defaults[fileType] || "";
}

function isSupportedUploadExtension(ext, fileType) {
  const extensions = {
    image: [".jpg", ".jpeg", ".png"],
    video: [".mp4", ".mov"],
    audio: [".wav", ".mp3"],
  };
  return (extensions[fileType] || []).includes(ext);
}

function mimeTypeForRemote(contentType, fileName, fileType) {
  const normalized = String(contentType || "").toLowerCase().split(";")[0].trim();
  if (normalized) return normalized;
  return mimeTypeForFileName(fileName, fileType);
}

function mimeTypeForFileName(fileName, fileType) {
  const ext = path.extname(fileName).toLowerCase();
  const byExt = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
  };
  if (byExt[ext]) return byExt[ext];
  const defaults = {
    image: "image/jpeg",
    video: "video/mp4",
    audio: "audio/mpeg",
  };
  return defaults[fileType] || "application/octet-stream";
}

async function getTask(config, taskId, flags) {
  const query = {};
  copyOptionalFlag(flags, query, "status");
  copyOptionalFlag(flags, query, "current");
  copyOptionalFlag(flags, query, "size");
  const response = await apiRequest(config, {
    method: "GET",
    path: "/video-create/tasks",
    query,
  });
  const task = findRecords(response.data).find((item) => (item.taskId || item.id) === taskId);
  if (!task) fail(`Task not found: ${taskId}`, 5);
  return task;
}

async function watchTask(config, taskId, flags) {
  const intervalMs = Number(flags.interval || config.pollInterval || 5) * 1000;
  const maxAttempts = Number(flags["max-attempts"] || 120);
  let attempt = 0;
  while (attempt < maxAttempts) {
    const task = await getTask(config, taskId, flags);
    if (isTerminalStatus(task)) {
      return task;
    }
    if (!flags.quiet) {
      console.error(`Watching task ${taskId}... status=${formatTaskStatus(task)} attempt=${attempt + 1}/${maxAttempts}`);
    }
    attempt += 1;
    await sleep(intervalMs);
  }
  fail(`Task timed out: ${taskId}`, 6);
}

function isTerminalStatus(task) {
  const normalized = normalizeTaskStatus(task);
  if (!normalized) return false;
  return ["success", "completed", "failed", "error", "canceled", "cancelled"].includes(normalized);
}

function isSuccessStatus(task) {
  const normalized = normalizeTaskStatus(task);
  if (!normalized) return false;
  return ["success", "completed"].includes(normalized);
}

function formatTaskStatus(task) {
  const rawStatus = task && typeof task === "object" ? task.status : task;
  const normalized = normalizeTaskStatus(task);
  if (!normalized) return "unknown";
  if (normalized === String(rawStatus)) return normalized;
  return `${rawStatus} (${normalized})`;
}

async function toggleStrategy(config, id, enable) {
  return apiRequest(config, {
    method: "POST",
    path: `/strategies/${id}/toggle`,
    body: { enable },
  });
}

function copyOptionalFlag(flags, target, from, to = from, mapValue = (value) => value) {
  if (flags[from] != null) target[to] = mapValue(flags[from]);
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

function buildVideoLibraryListRequest(flags) {
  const body = buildListRequest(flags);
  copyOptionalFlag(flags, body, "name");
  copyOptionalFlag(flags, body, "source-type", "sourceType");
  copyOptionalCsvFlag(flags, body, "task-ids", "taskIds");
  copyOptionalCsvFlag(flags, body, "strategy-ids", "strategyIds");
  copyOptionalCsvFlag(flags, body, "business-ids", "businessIds");
  copyOptionalCsvFlag(flags, body, "audit-status", "auditStatus", Number);
  copyOptionalCsvFlag(flags, body, "label-ids", "labelIds");
  copyOptionalCsvFlag(flags, body, "date-range", "dateRange");
  return body;
}

function buildStrategyListRequest(flags) {
  const body = buildListRequest(flags);
  copyOptionalFlag(flags, body, "name");
  copyOptionalFlag(flags, body, "status", "status", Number);
  copyOptionalCsvFlag(flags, body, "date-range", "dateRange");
  copyOptionalFlag(flags, body, "sort");
  copyOptionalFlag(flags, body, "order");
  copyOptionalFlag(flags, body, "business-id", "businessId");
  return body;
}

function buildSendRecordsRequest(flags) {
  const body = buildListRequest(flags);
  copyOptionalFlag(flags, body, "strategy-id", "strategyId");
  copyOptionalFlag(flags, body, "business-id", "businessId");
  copyOptionalFlag(flags, body, "status", "status", Number);
  copyOptionalCsvFlag(flags, body, "work-type", "workType");
  copyOptionalFlag(flags, body, "sort");
  copyOptionalFlag(flags, body, "order");
  copyOptionalFlag(flags, body, "start-time", "startTime");
  copyOptionalFlag(flags, body, "end-time", "endTime");
  return body;
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
      size: Number(flags.size || 100),
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

function validateUploadFile(filePath, fileType) {
  const stats = fs.statSync(filePath);
  return validateUploadMeta({
    size: stats.size,
    ext: path.extname(filePath).toLowerCase(),
    fileType,
    sourceLabel: filePath,
  });
}

function validateUploadBuffer(buffer, fileName, fileType) {
  return validateUploadMeta({
    size: buffer.length,
    ext: path.extname(fileName).toLowerCase(),
    fileType,
    sourceLabel: fileName,
  });
}

function validateUploadMeta({ size, ext, fileType, sourceLabel }) {
  const limits = {
    image: { maxSize: 7 * 1024 * 1024, extensions: [".jpg", ".jpeg", ".png"] },
    video: { maxSize: 10 * 1024 * 1024, extensions: [".mp4", ".mov"] },
    audio: { maxSize: 5 * 1024 * 1024, extensions: [".wav", ".mp3"] },
  };
  const rule = limits[fileType];
  if (!rule.extensions.includes(ext)) {
    fail(`Unsupported ${fileType} extension for ${sourceLabel}: ${ext || "(none)"}`, 1);
  }
  if (size > rule.maxSize) {
    fail(`${fileType} file exceeds size limit of ${Math.floor(rule.maxSize / (1024 * 1024))}MB: ${sourceLabel}`, 1);
  }
}

function copyOptionalCsvFlag(flags, target, from, to = from, mapValue = (value) => value) {
  if (flags[from] == null) return;
  target[to] = String(flags[from]).split(",").map((value) => mapValue(value.trim())).filter((value) => value !== "");
}

module.exports = { main };
