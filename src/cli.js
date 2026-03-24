const fs = require("fs");
const path = require("path");
const { loadConfig, saveApiKey, clearApiKey, getConfigPath } = require("./config");
const { apiRequest, maskApiKey } = require("./http");
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
      return handleAuth(subcommand, rest, parsed.flags, config);
    case "accounts":
      return handleAccounts(subcommand, parsed.flags, config);
    case "labels":
      return handleLabels(subcommand, parsed.flags, config);
    case "templates":
      return handleTemplates(subcommand, parsed.flags, config);
    case "video":
      return handleVideo(subcommand, rest, parsed.flags, config);
    case "publish":
      return handlePublish(subcommand, rest, parsed.flags, config);
    case "raw":
      return handleRaw(subcommand, rest, parsed.flags, config);
    case "completion":
      return handleCompletion(subcommand);
    default:
      fail(`Unknown command: ${command}`, 1);
  }
}

async function handleAuth(subcommand, rest, flags, config) {
  switch (subcommand) {
    case "set-key": {
      const apiKey = rest[0];
      if (!apiKey) fail("Usage: beervid auth set-key <api_key>", 1);
      saveApiKey(apiKey, flags);
      formatOutput({
        flags,
        command: "auth.set-key",
        data: {
          message: "API key saved successfully",
          configPath: getConfigPath(flags),
        },
        textLines: [
          "API key saved successfully",
          `config: ${getConfigPath(flags)}`,
        ],
      });
      return;
    }
    case "status": {
      formatOutput({
        flags,
        command: "auth.status",
        data: {
          configured: Boolean(config.apiKey),
          baseUrl: config.baseUrl,
          apiKey: config.apiKey ? maskApiKey(config.apiKey) : null,
        },
        textLines: config.apiKey
          ? [
              "Authentication configured",
              `base_url: ${config.baseUrl}`,
              `api_key: ${maskApiKey(config.apiKey)}`,
            ]
          : [
              "Authentication not configured",
              `config: ${getConfigPath(flags)}`,
            ],
      });
      return;
    }
    case "test": {
      requireApiKey(config);
      const checkResponse = await apiRequest(config, {
        method: "GET",
        path: "/check",
      });
      const profileResponse = await apiRequest(config, {
        method: "GET",
        path: "/profile",
      });
      formatOutput({
        flags,
        command: "auth.test",
        data: {
          ok: true,
          baseUrl: config.baseUrl,
          check: checkResponse.data,
          profile: profileResponse.data,
        },
        textLines: [
          "Authentication test passed",
          `base_url: ${config.baseUrl}`,
          `status: ${findDeepValue(checkResponse.data, ["status"]) || "authenticated"}`,
          `username: ${findDeepValue(profileResponse.data, ["username"]) || findDeepValue(checkResponse.data, ["username"]) || "unknown"}`,
        ],
      });
      return;
    }
    case "check": {
      requireApiKey(config);
      const response = await apiRequest(config, {
        method: "GET",
        path: "/check",
      });
      formatOutput({
        flags,
        command: "auth.check",
        data: response.data,
        textLines: [
          "Authentication status",
          `status: ${findDeepValue(response.data, ["status"]) || "unknown"}`,
          `username: ${findDeepValue(response.data, ["username"]) || "unknown"}`,
        ],
      });
      return;
    }
    case "profile": {
      requireApiKey(config);
      const response = await apiRequest(config, {
        method: "GET",
        path: "/profile",
      });
      formatOutput({
        flags,
        command: "auth.profile",
        data: response.data,
        textLines: [
          "Profile",
          `user_id: ${findDeepValue(response.data, ["userId"]) || "unknown"}`,
          `username: ${findDeepValue(response.data, ["username"]) || "unknown"}`,
          `email: ${findDeepValue(response.data, ["email"]) || "-"}`,
          `membership: ${findDeepValue(response.data, ["membershipTierCode"]) || "-"}`,
          `api_key_name: ${findDeepValue(response.data, ["apiKeyName"]) || "-"}`,
        ],
      });
      return;
    }
    case "clear": {
      clearApiKey(flags);
      formatOutput({
        flags,
        command: "auth.clear",
        data: { message: "API key removed" },
        textLines: ["API key removed"],
      });
      return;
    }
    default:
      printSubcommandHelp("auth");
  }
}

async function handleAccounts(subcommand, flags, config) {
  requireApiKey(config);

  if (subcommand === "list") {
    const query = {};
    copyOptionalFlag(flags, query, "current");
    copyOptionalFlag(flags, query, "size");
    copyOptionalFlag(flags, query, "keyword");
    query.shoppableType = flags["shoppable-type"] || "ALL";
    const response = await apiRequest(config, {
      method: "GET",
      path: "/tt-accounts",
      query,
    });
    const records = findRecords(response.data);
    formatOutput({
      flags,
      command: "accounts.list",
      data: response.data,
      textLines: [
        `${records.length} accounts found`,
        "",
        ...records.map((record) => {
          const id = record.businessId || record.id || record.accountId || "-";
          const name = record.displayName || record.name || "-";
          const openId = record.creatorUserOpenId || "-";
          return `- ${id}  ${name}   creator_user_open_id=${openId}`;
        }),
      ],
    });
    return;
  }

  if (subcommand === "shoppable") {
    const response = await apiRequest(config, {
      method: "GET",
      path: "/tt-accounts",
      query: {
        current: flags.current || 1,
        size: flags.size || 50,
        keyword: flags.keyword,
        shoppableType: "TTS",
      },
    });
    const records = findRecords(response.data);
    formatOutput({
      flags,
      command: "accounts.shoppable",
      data: records,
      textLines: [
        `${records.length} shoppable account${records.length === 1 ? "" : "s"} found`,
        "",
        ...records.map((record) => `- ${record.id || record.accountId || "-"}  ${record.displayName || record.name || "-"}`),
      ],
    });
    return;
  }

  printSubcommandHelp("accounts");
}

async function handleLabels(subcommand, flags, config) {
  requireApiKey(config);
  if (subcommand !== "list") {
    printSubcommandHelp("labels");
    return;
  }

  const response = await apiRequest(config, {
    method: "GET",
    path: "/video-create/labels",
  });
  const records = findRecords(response.data);
  formatOutput({
    flags,
    command: "labels.list",
    data: response.data,
    textLines: [
      `${records.length} labels found`,
      "",
      ...records.map((record) => `- ${record.id || record.labelId || "-"}  ${record.name || record.labelName || "-"}`),
    ],
  });
}

async function handleTemplates(subcommand, flags, config) {
  requireApiKey(config);

  if (subcommand === "list") {
    const response = await apiRequest(config, {
      method: "GET",
      path: "/templates/options",
    });
    const records = findRecords(response.data);
    formatOutput({
      flags,
      command: "templates.list",
      data: response.data,
      textLines: [
        `${records.length} templates found`,
        "",
        ...records.map((record) => `- ${record.value || record.id || record.templateId || "-"}  ${record.label || record.name || record.templateName || "-"}`),
      ],
    });
    return;
  }

  if (subcommand === "get") {
    const id = flags.id;
    if (!id) fail("Usage: beervid templates get --id <template_id>", 1);
    const response = await apiRequest(config, {
      method: "GET",
      path: `/templates/${id}`,
    });
    const data = response.data && response.data.data ? response.data.data : response.data;
    formatOutput({
      flags,
      command: "templates.get",
      data: response.data,
      textLines: [
        "Template details",
        `template_id: ${id}`,
        `name: ${findDeepValue(data, ["name", "label"]) || "unknown"}`,
        `tech_type: ${findDeepValue(data, ["techType"]) || "-"}`,
        `video_scale: ${findDeepValue(data, ["videoScale"]) || "-"}`,
      ],
    });
    return;
  }

  printSubcommandHelp("templates");
}

async function handleVideo(subcommand, rest, flags, config) {
  requireApiKey(config);

  if (subcommand === "create") {
    const body = validateVideoCreatePayload(readJsonInput(flags));
    const response = await apiRequest(config, {
      method: "POST",
      path: "/video-create",
      body,
    });
    const taskId = findTaskId(response.data);
    formatOutput({
      flags,
      command: "video.create",
      data: response.data,
      textLines: [
        "Video task created successfully",
        `task_id: ${taskId || "unknown"}`,
        `status: ${findStatus(response.data) || "pending"}`,
        "",
        "Next:",
        `  beervid video tasks get --task-id ${taskId || "<task_id>"}`,
      ],
    });
    return;
  }

  if (subcommand === "upload") {
    const filePath = flags.path || flags.file;
    const fileType = flags.type || flags["file-type"];
    if (!filePath || !fileType) {
      fail("Usage: beervid video upload --path <file> --type <image|video|audio>", 1);
    }
    if (!["image", "video", "audio"].includes(fileType)) {
      fail("Upload type must be one of: image, video, audio", 1);
    }
    if (!fs.existsSync(filePath)) {
      fail(`File not found: ${filePath}`, 1);
    }
    validateUploadFile(filePath, fileType);

    const formData = new FormData();
    formData.set("file", new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
    formData.set("fileType", fileType);
    const response = await apiRequest(config, {
      method: "POST",
      path: "/video-create/upload",
      formData,
    });
    const fileUrl = findDeepValue(response.data, ["fileUrl", "url"]);
    formatOutput({
      flags,
      command: "video.upload",
      data: response.data,
      textLines: [
        "File uploaded successfully",
        `file: ${path.resolve(filePath)}`,
        `type: ${fileType}`,
        ...(fileUrl ? [`file_url: ${fileUrl}`] : []),
      ],
    });
    return;
  }

  if (subcommand === "tasks") {
    return handleVideoTasks(rest[0], flags, config);
  }

  if (subcommand === "list") {
    const body = flags.file || flags.stdin
      ? readJsonInput(flags)
      : buildVideoLibraryListRequest(flags);
    const response = await apiRequest(config, {
      method: "POST",
      path: "/videos/library/list",
      body,
    });
    const records = findRecords(response.data);
    formatOutput({
      flags,
      command: "video.list",
      data: response.data,
      textLines: [
        `${records.length} videos found`,
        "",
        ...records.map((record) => `- ${record.id || record.videoId || "-"}  ${record.title || record.name || "-"}`),
      ],
    });
    return;
  }

  if (subcommand === "publish") {
    const body = normalizeVideoPublishPayload(readJsonInput(flags));
    const response = await apiRequest(config, {
      method: "POST",
      path: "/videos/library/publish",
      body,
    });
    const publishTaskId = findDeepValue(response.data, ["publishTaskId", "publish_task_id", "id"]);
    formatOutput({
      flags,
      command: "video.publish",
      data: response.data,
      textLines: [
        "Video publish request submitted",
        `publish_task_id: ${publishTaskId || "unknown"}`,
        `status: ${findStatus(response.data) || "submitted"}`,
      ],
    });
    return;
  }

  if (subcommand === "data") {
    return handleVideoData(rest[0], flags, config);
  }

  if (subcommand === "run") {
    const body = validateVideoCreatePayload(readJsonInput(flags));
    const created = await apiRequest(config, {
      method: "POST",
      path: "/video-create",
      body,
    });
    const taskId = findTaskId(created.data);
    if (!taskId) fail("Unable to determine task_id from video create response", 5);
    const watched = await watchTask(config, taskId, flags);
    const listed = await apiRequest(config, {
      method: "POST",
      path: "/videos/library/list",
      body: buildVideoLibraryListRequest(flags),
    });
    const records = findRecords(listed.data);
    formatOutput({
      flags,
      command: "video.run",
      data: {
        create: created.data,
        task: watched,
        videos: listed.data,
      },
      textLines: [
        "Video workflow completed",
        `task_id: ${taskId}`,
        `status: ${findStatus(watched) || "success"}`,
        `latest_video_id: ${records[0] ? records[0].id || records[0].videoId || "unknown" : "unknown"}`,
      ],
    });
    return;
  }

  printSubcommandHelp("video");
}

async function handleVideoData(subcommand, flags, config) {
  if (subcommand !== "get") {
    printSubcommandHelp("video");
    return;
  }

  const id = flags.id;
  if (!id) fail("Usage: beervid video data get --id <publish_task_id>", 1);
  const response = await apiRequest(config, {
    method: "GET",
    path: `/video/publish-task/${id}`,
  });

  const data = response.data && response.data.data ? response.data.data : response.data;
  formatOutput({
    flags,
    command: "video.data.get",
    data: response.data,
    textLines: [
      "Video data",
      `id: ${id}`,
      ...(findDeepValue(data, ["playCount", "views"]) != null ? [`views: ${findDeepValue(data, ["playCount", "views"])}`] : []),
      ...(findDeepValue(data, ["likeCount", "likes"]) != null ? [`likes: ${findDeepValue(data, ["likeCount", "likes"])}`] : []),
      ...(findDeepValue(data, ["commentCount", "comments"]) != null ? [`comments: ${findDeepValue(data, ["commentCount", "comments"])}`] : []),
      ...(findDeepValue(data, ["shareCount", "shares"]) != null ? [`shares: ${findDeepValue(data, ["shareCount", "shares"])}`] : []),
      ...(findDeepValue(data, ["publishedAt"]) ? [`published_at: ${findDeepValue(data, ["publishedAt"])}`] : []),
    ],
  });
}

async function handleVideoTasks(subcommand, flags, config) {
  if (subcommand === "list") {
    const query = {};
    copyOptionalFlag(flags, query, "status");
    copyOptionalFlag(flags, query, "current");
    copyOptionalFlag(flags, query, "size");
    const response = await apiRequest(config, {
      method: "GET",
      path: "/video-create/tasks",
      query,
    });
    const records = findRecords(response.data);
    formatOutput({
      flags,
      command: "video.tasks.list",
      data: response.data,
      textLines: [
        `${records.length} tasks found`,
        "",
        ...records.map((record) => `- ${record.id || record.taskId || "-"}  ${formatTaskStatus(record)}`),
      ],
    });
    return;
  }

  if (subcommand === "get") {
    const taskId = flags["task-id"];
    if (!taskId) fail("Usage: beervid video tasks get --task-id <task_id>", 1);
    const task = await getTask(config, taskId, flags);
    formatOutput({
      flags,
      command: "video.tasks.get",
      data: task,
      textLines: [
        "Task status",
        `task_id: ${taskId}`,
        `status: ${formatTaskStatus(task)}`,
        ...(task.progress != null ? [`progress: ${task.progress}`] : []),
        ...(task.errorMessage ? [`reason: ${task.errorMessage}`] : []),
      ],
    });
    return;
  }

  if (subcommand === "watch") {
    const taskId = flags["task-id"];
    if (!taskId) fail("Usage: beervid video tasks watch --task-id <task_id>", 1);
    const task = await watchTask(config, taskId, flags);
    const done = isSuccessStatus(task);
    formatOutput({
      flags,
      command: "video.tasks.watch",
      data: task,
      textLines: done
        ? ["Task completed", `task_id: ${taskId}`, `status: ${formatTaskStatus(task)}`]
        : ["Task failed", `task_id: ${taskId}`, `status: ${formatTaskStatus(task)}`, ...(task.errorMessage ? [`reason: ${task.errorMessage}`] : [])],
    });
    if (!done) process.exitCode = 5;
    return;
  }

  printSubcommandHelp("video.tasks");
}

async function handlePublish(subcommand, rest, flags, config) {
  requireApiKey(config);

  if (subcommand === "products") {
    const creatorUserOpenId = await resolveCreatorUserOpenId(config, flags);
    const body = flags.file || flags.stdin
      ? readJsonInput(flags)
      : {
          current: Number(flags.current || 1),
          size: Number(flags.size || 10),
          creatorUserOpenId,
        };
    const response = await apiRequest(config, {
      method: "POST",
      path: "/shop-products/list",
      body,
    });
    const records = findRecords(response.data);
    formatOutput({
      flags,
      command: "publish.products",
      data: response.data,
      textLines: [
        `${records.length} products found${creatorUserOpenId ? ` for creator ${creatorUserOpenId}` : ""}`,
        "",
        ...records.map((record) => `- ${record.id || record.productId || "-"}  ${record.title || record.name || record.productName || "-"}`),
      ],
    });
    return;
  }

  if (subcommand === "strategy") {
    return handlePublishStrategy(rest[0], flags, config);
  }

  if (subcommand === "records") {
    const body = flags.file || flags.stdin
      ? readJsonInput(flags)
      : buildSendRecordsRequest(flags);
    const response = await apiRequest(config, {
      method: "POST",
      path: "/send-records/list",
      body,
    });
    const records = findRecords(response.data);
    formatOutput({
      flags,
      command: "publish.records",
      data: response.data,
      textLines: [
        `${records.length} publish records found`,
        "",
        ...records.map((record) => {
          const id = record.id || record.recordId || "-";
          const status = record.status || "-";
          const accountId = record.accountId || record.businessId || "-";
          const time = record.publishedAt || record.createdAt || "-";
          return `- ${id}  ${status}   ${accountId}   ${time}`;
        }),
      ],
    });
    return;
  }

  if (subcommand === "run") {
    const body = readJsonInput(flags);
    const created = await apiRequest(config, {
      method: "POST",
      path: "/strategies/create",
      body: normalizeStrategyPayload(body),
    });
    const strategyId = findStrategyId(created.data);
    if (!strategyId) fail("Unable to determine strategy_id from create response", 5);
    const enabled = await toggleStrategy(config, strategyId);
    const actualState = formatEnabledState(findEnabledState(enabled.data));
    formatOutput({
      flags,
      command: "publish.run",
      data: { create: created.data, enable: enabled.data },
      textLines: [
        "Publish workflow completed",
        `strategy_id: ${strategyId}`,
        `status: ${actualState || "unknown"}`,
      ],
    });
    return;
  }

  printSubcommandHelp("publish");
}

async function handlePublishStrategy(subcommand, flags, config) {
  if (subcommand === "list") {
    const response = await apiRequest(config, {
      method: "POST",
      path: "/strategies/list",
      body: buildStrategyListRequest(flags),
    });
    const records = findRecords(response.data);
    formatOutput({
      flags,
      command: "publish.strategy.list",
      data: response.data,
      textLines: [
        `${records.length} strategies found`,
        "",
        ...records.map((record) => {
          const status = formatEnabledState(findEnabledState(record));
          return `- ${record.id || record.strategyId || "-"}  ${record.name || record.strategyName || "-"}  ${status || "-"}`;
        }),
      ],
    });
    return;
  }

  if (subcommand === "get") {
    const id = flags.id;
    if (!id) fail("Usage: beervid publish strategy get --id <strategy_id>", 1);
    const response = await apiRequest(config, {
      method: "GET",
      path: `/strategies/${id}`,
    });
    const data = response.data && response.data.data ? response.data.data : response.data;
    formatOutput({
      flags,
      command: "publish.strategy.get",
      data: response.data,
      textLines: [
        "Strategy details",
        `strategy_id: ${id}`,
        `name: ${findName(data) || "unknown"}`,
        `status: ${formatEnabledState(findEnabledState(data)) || "unknown"}`,
      ],
    });
    return;
  }

  if (subcommand === "create") {
    const body = readJsonInput(flags);
    const response = await apiRequest(config, {
      method: "POST",
      path: "/strategies/create",
      body: normalizeStrategyPayload(body),
    });
    const strategyId = findStrategyId(response.data);
    formatOutput({
      flags,
      command: "publish.strategy.create",
      data: response.data,
      textLines: [
        "Strategy created successfully",
        `strategy_id: ${strategyId || "unknown"}`,
        `name: ${findName(response.data) || "unknown"}`,
        "enabled: false",
        "",
        "Next:",
        `  beervid publish strategy enable --id ${strategyId || "<strategy_id>"}`,
      ],
    });
    return;
  }

  if (subcommand === "enable") {
    const id = flags.id;
    if (!id) fail("Usage: beervid publish strategy enable --id <strategy_id>", 1);
    const response = await toggleStrategy(config, id, true);
    const actualState = formatEnabledState(findEnabledState(response.data));
    formatOutput({
      flags,
      command: "publish.strategy.enable",
      data: response.data,
      textLines: [
        "Strategy toggle request completed",
        `strategy_id: ${id}`,
        `status: ${actualState || "unknown"}`,
      ],
    });
    return;
  }

  if (subcommand === "disable") {
    const id = flags.id;
    if (!id) fail("Usage: beervid publish strategy disable --id <strategy_id>", 1);
    const response = await toggleStrategy(config, id, false);
    const actualState = formatEnabledState(findEnabledState(response.data));
    formatOutput({
      flags,
      command: "publish.strategy.disable",
      data: response.data,
      textLines: [
        "Strategy toggle request completed",
        `strategy_id: ${id}`,
        `status: ${actualState || "unknown"}`,
      ],
    });
    return;
  }

  if (subcommand === "delete") {
    const id = flags.id;
    if (!id) fail("Usage: beervid publish strategy delete --id <strategy_id>", 1);
    const response = await apiRequest(config, {
      method: "DELETE",
      path: `/strategies/${id}`,
    });
    formatOutput({
      flags,
      command: "publish.strategy.delete",
      data: response.data,
      textLines: [
        "Strategy deleted successfully",
        `strategy_id: ${id}`,
      ],
    });
    return;
  }

  printSubcommandHelp("publish.strategy");
}

async function handleRaw(subcommand, rest, flags, config) {
  requireApiKey(config);
  const path = rest[0];
  if (!path) fail("Usage: beervid raw <get|post> <path> [--file payload.json]", 1);

  const method = subcommand && subcommand.toUpperCase();
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    fail("Usage: beervid raw <get|post|put|patch|delete> <path> [--file payload.json]", 1);
  }

  const response = await apiRequest(config, {
    method,
    path: path.startsWith("/") ? path : `/${path}`,
    body: method === "GET" ? undefined : readJsonInput(flags, { optional: true }),
  });

  formatOutput({
    flags: { ...flags, json: true },
    command: `raw.${subcommand}`,
    data: response.data,
  });
}

function handleCompletion(subcommand) {
  if (subcommand !== "zsh" && subcommand !== "bash" && subcommand !== "fish") {
    printSubcommandHelp("completion");
    return;
  }
  const scripts = {
    zsh: "#compdef beervid\n_arguments '*::arg:->args'",
    bash: "complete -W 'auth accounts labels templates video publish raw completion' beervid",
    fish: "complete -c beervid -f -a 'auth accounts labels templates video publish raw completion'",
  };
  process.stdout.write(`${scripts[subcommand]}\n`);
}

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

  const { techType, fragmentList } = payload;
  if (!techType) return payload;
  if (!["veo", "sora"].includes(techType)) {
    fail("video create techType must be one of: veo, sora", 1);
  }

  if (!Array.isArray(fragmentList) || fragmentList.length === 0) {
    fail("video create fragmentList must be a non-empty array.", 1);
  }

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

    if (techType === "veo" && (fragment.segmentCount < 1 || fragment.segmentCount > 4)) {
      fail(`${prefix}.segmentCount must be 1-4 for veo (1=8s, 2=16s, 3=24s, 4=32s).`, 1);
    }

    if (techType === "sora") {
      if (fragment.useCoverFrame === true) {
        fail(`${prefix}.useCoverFrame must be false for sora.`, 1);
      }
      if (fragment.segmentCount !== 1) {
        fail(`${prefix}.segmentCount must be 1 for sora (15s).`, 1);
      }
      if (fragment.spliceMethod === "LONG_TAKE") {
        fail(`${prefix}.spliceMethod LONG_TAKE is not supported for sora.`, 1);
      }
    }
  });

  return payload;
}

function normalizeVideoCreatePayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return body;
  }
  if (body.formData && typeof body.formData === "object") {
    return body.formData;
  }
  if (body.request && typeof body.request === "object") {
    return body.request;
  }
  return body;
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

function normalizeTaskStatus(task) {
  const rawStatus = task && typeof task === "object" ? task.status : task;
  if (rawStatus == null) return null;
  const normalized = String(rawStatus).toLowerCase();

  // Per the official Beervid docs:
  // 0 = failed, 1 = success, 2 = processing
  if (normalized === "0") return "failed";
  if (normalized === "1") return "completed";
  if (normalized === "2") return "processing";
  if (["success", "completed", "failed", "error", "canceled", "cancelled", "processing", "pending", "running"].includes(normalized)) {
    return normalized;
  }
  return normalized;
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

function findTaskId(data) {
  return findDeepValue(data, ["taskId", "task_id", "id"]) || findTaskIdsFromMessage(data)[0] || null;
}

function findStrategyId(data) {
  return findDeepValue(data, ["strategyId", "strategy_id", "id"]);
}

function findStatus(data) {
  return findDeepValue(data, ["status", "taskStatus"]);
}

function findName(data) {
  return findDeepValue(data, ["name", "strategyName"]);
}

function findEnabledState(data) {
  const value = findDeepValue(data, ["enabled", "isEnabled", "active", "status"]);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["enabled", "enable", "active", "true", "1"].includes(normalized)) return true;
    if (["disabled", "disable", "inactive", "false", "0"].includes(normalized)) return false;
  }
  return null;
}

function formatEnabledState(value) {
  if (value === true) return "enabled";
  if (value === false) return "disabled";
  return null;
}

function findDeepValue(input, keys) {
  if (!input || typeof input !== "object") return null;
  for (const key of keys) {
    if (input[key] != null) return input[key];
  }
  for (const value of Object.values(input)) {
    if (value && typeof value === "object") {
      const nested = findDeepValue(value, keys);
      if (nested != null) return nested;
    }
  }
  return null;
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

function normalizeVideoPublishPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const normalized = { ...body };
  if (normalized.businessId == null && normalized.accountId != null) {
    normalized.businessId = normalized.accountId;
  }
  return normalized;
}

function normalizeStrategyPayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  return body.strategyCreateDTO && typeof body.strategyCreateDTO === "object"
    ? body.strategyCreateDTO
    : body;
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
  const ext = path.extname(filePath).toLowerCase();
  const limits = {
    image: { maxSize: 7 * 1024 * 1024, extensions: [".jpg", ".jpeg", ".png"] },
    video: { maxSize: 10 * 1024 * 1024, extensions: [".mp4", ".mov"] },
    audio: { maxSize: 5 * 1024 * 1024, extensions: [".wav", ".mp3"] },
  };
  const rule = limits[fileType];
  if (!rule.extensions.includes(ext)) {
    fail(`Unsupported ${fileType} extension: ${ext || "(none)"}`, 1);
  }
  if (stats.size > rule.maxSize) {
    fail(`${fileType} file exceeds size limit of ${Math.floor(rule.maxSize / (1024 * 1024))}MB`, 1);
  }
}

function copyOptionalCsvFlag(flags, target, from, to = from, mapValue = (value) => value) {
  if (flags[from] == null) return;
  target[to] = String(flags[from]).split(",").map((value) => mapValue(value.trim())).filter((value) => value !== "");
}

function findTaskIdsFromMessage(data) {
  const message = findDeepValue(data, ["message"]);
  if (typeof message !== "string") return [];
  const matches = message.match(/[A-Za-z0-9_-]{8,}/g);
  if (!matches) return [];
  return matches.filter((value) => value.toLowerCase() !== "success");
}

module.exports = { main };
