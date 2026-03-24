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
      const response = await apiRequest(config, {
        method: "GET",
        path: "/templates/options",
      });
      formatOutput({
        flags,
        command: "auth.test",
        data: {
          ok: true,
          baseUrl: config.baseUrl,
          sample: response.data,
        },
        textLines: [
          "Authentication test passed",
          `base_url: ${config.baseUrl}`,
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
    copyOptionalFlag(flags, query, "shoppable-type", "shoppableType");
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
          const id = record.id || record.accountId || "-";
          const name = record.displayName || record.name || "-";
          const shoppable = record.hasShoppingCart;
          return `- ${id}  ${name}   shoppable=${String(Boolean(shoppable))}`;
        }),
      ],
    });
    return;
  }

  if (subcommand === "shoppable") {
    const response = await apiRequest(config, {
      method: "GET",
      path: "/tt-accounts",
      query: { current: flags.current || 1, size: flags.size || 50, shoppableType: "ALL" },
    });
    const records = findRecords(response.data).filter((item) => item.hasShoppingCart === true);
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

async function handleTemplates(subcommand, flags, config) {
  requireApiKey(config);
  if (subcommand !== "list") {
    printSubcommandHelp("templates");
    return;
  }

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
      ...records.map((record) => `- ${record.id || record.templateId || "-"}  ${record.name || record.templateName || "-"}`),
    ],
  });
}

async function handleVideo(subcommand, rest, flags, config) {
  requireApiKey(config);

  if (subcommand === "create") {
    const body = readJsonInput(flags);
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

  if (subcommand === "tasks") {
    return handleVideoTasks(rest[0], flags, config);
  }

  if (subcommand === "list") {
    const body = flags.file || flags.stdin
      ? readJsonInput(flags)
      : { request: buildListRequest(flags) };
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

  if (subcommand === "run") {
    const body = readJsonInput(flags);
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
      body: { request: buildListRequest(flags) },
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
        ...records.map((record) => `- ${record.id || record.taskId || "-"}  ${record.status || "-"}`),
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
        `status: ${task.status || "unknown"}`,
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
    const done = isSuccessStatus(task.status);
    formatOutput({
      flags,
      command: "video.tasks.watch",
      data: task,
      textLines: done
        ? ["Task completed", `task_id: ${taskId}`, `status: ${task.status || "success"}`]
        : ["Task failed", `task_id: ${taskId}`, `status: ${task.status || "failed"}`, ...(task.errorMessage ? [`reason: ${task.errorMessage}`] : [])],
    });
    if (!done) process.exitCode = 5;
    return;
  }

  printSubcommandHelp("video.tasks");
}

async function handlePublish(subcommand, rest, flags, config) {
  requireApiKey(config);

  if (subcommand === "products") {
    const accountId = flags["account-id"];
    const body = flags.file || flags.stdin
      ? readJsonInput(flags)
      : { request: { ...buildListRequest(flags), ...(accountId ? { accountId } : {}) } };
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
        `${records.length} products found${accountId ? ` for account ${accountId}` : ""}`,
        "",
        ...records.map((record) => `- ${record.id || record.productId || "-"}  ${record.name || record.productName || "-"}`),
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
      : { request: { ...buildListRequest(flags), ...(flags.status ? { status: flags.status } : {}), ...(flags["account-id"] ? { accountId: flags["account-id"] } : {}) } };
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
      body,
    });
    const strategyId = findStrategyId(created.data);
    if (!strategyId) fail("Unable to determine strategy_id from create response", 5);
    const enabled = await toggleStrategy(config, strategyId);
    formatOutput({
      flags,
      command: "publish.run",
      data: { create: created.data, enable: enabled.data },
      textLines: [
        "Publish workflow completed",
        `strategy_id: ${strategyId}`,
        "status: enabled",
      ],
    });
    return;
  }

  printSubcommandHelp("publish");
}

async function handlePublishStrategy(subcommand, flags, config) {
  if (subcommand === "create") {
    const body = readJsonInput(flags);
    const response = await apiRequest(config, {
      method: "POST",
      path: "/strategies/create",
      body,
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
    const response = await toggleStrategy(config, id);
    formatOutput({
      flags,
      command: "publish.strategy.enable",
      data: response.data,
      textLines: [
        "Strategy enabled successfully",
        `strategy_id: ${id}`,
        "status: enabled",
      ],
    });
    return;
  }

  if (subcommand === "disable") {
    const id = flags.id;
    if (!id) fail("Usage: beervid publish strategy disable --id <strategy_id>", 1);
    const response = await toggleStrategy(config, id);
    formatOutput({
      flags,
      command: "publish.strategy.disable",
      data: response.data,
      textLines: [
        "Strategy disabled successfully",
        `strategy_id: ${id}`,
        "status: disabled",
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
  if (method !== "GET" && method !== "POST") {
    fail("Usage: beervid raw <get|post> <path> [--file payload.json]", 1);
  }

  const response = await apiRequest(config, {
    method,
    path: path.startsWith("/") ? path : `/${path}`,
    body: method === "POST" ? readJsonInput(flags, { optional: true }) : undefined,
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
    bash: "complete -W 'auth accounts templates video publish raw completion' beervid",
    fish: "complete -c beervid -f -a 'auth accounts templates video publish raw completion'",
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
    if (isTerminalStatus(task.status)) {
      return task;
    }
    if (!flags.quiet) {
      console.error(`Watching task ${taskId}... status=${task.status || "unknown"} attempt=${attempt + 1}/${maxAttempts}`);
    }
    attempt += 1;
    await sleep(intervalMs);
  }
  fail(`Task timed out: ${taskId}`, 6);
}

function isTerminalStatus(status) {
  if (!status) return false;
  const normalized = String(status).toLowerCase();
  return ["success", "completed", "failed", "error", "canceled", "cancelled", "2", "3"].includes(normalized);
}

function isSuccessStatus(status) {
  if (!status) return false;
  const normalized = String(status).toLowerCase();
  return ["success", "completed", "2"].includes(normalized);
}

async function toggleStrategy(config, id) {
  return apiRequest(config, {
    method: "POST",
    path: `/strategies/${id}/toggle`,
    body: {},
  });
}

function copyOptionalFlag(flags, target, from, to = from) {
  if (flags[from] != null) target[to] = flags[from];
}

function findRecords(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.records)) return data.records;
  if (data.data) return findRecords(data.data);
  return [];
}

function findTaskId(data) {
  return findDeepValue(data, ["taskId", "task_id", "id"]);
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

module.exports = { main };
