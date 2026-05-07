const { normalizeTaskStatus } = require("./core");
const { fail, parseNonNegativeNumber, parsePositiveInteger, parsePositiveNumber } = require("./validation");

async function getTask({ config, taskId, flags, apiRequest, findRecords, copyOptionalFlag }) {
  const query = {};
  copyOptionalFlag(flags, query, "status");
  if (flags.current != null) query.current = parsePositiveInteger(flags.current, "--current");
  if (flags.size != null) query.size = parsePositiveInteger(flags.size, "--size");
  const response = await apiRequest(config, {
    method: "GET",
    path: "/video-create/tasks",
    query,
  });
  const task = findRecords(response.data).find((item) => (item.taskId || item.id) === taskId);
  if (!task) fail(`Task not found: ${taskId}`, 5);
  return task;
}

async function watchTask({ config, taskId, flags, getTask, sleep }) {
  const initialWaitMs = parseNonNegativeNumber(flags["initial-wait"], "--initial-wait", 0) * 1000;
  const intervalMs = parsePositiveNumber(flags.interval, "--interval", config.pollInterval || 5) * 1000;
  const maxAttempts = parsePositiveInteger(flags["max-attempts"], "--max-attempts", 120);
  if (initialWaitMs > 0) {
    if (!flags.quiet) {
      console.error(`Waiting ${Math.floor(initialWaitMs / 1000)}s before first task check for ${taskId}...`);
    }
    await sleep(initialWaitMs);
  }
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

module.exports = {
  formatTaskStatus,
  getTask,
  isSuccessStatus,
  isTerminalStatus,
  watchTask,
};
