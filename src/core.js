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

function normalizeTaskStatus(task) {
  const rawStatus = task && typeof task === "object" ? task.status : task;
  if (rawStatus == null) return null;
  const normalized = String(rawStatus).toLowerCase();

  if (normalized === "0") return "failed";
  if (normalized === "1") return "completed";
  if (normalized === "2") return "processing";
  if (["success", "completed", "failed", "error", "canceled", "cancelled", "processing", "pending", "running"].includes(normalized)) {
    return normalized;
  }
  return normalized;
}

function findTaskId(data) {
  return findDeepValue(data, ["taskId", "task_id", "id"]) || findTaskIdsDeep(data)[0] || null;
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

function findTaskIdsDeep(input) {
  if (typeof input === "string") {
    return findTaskIdsFromString(input);
  }
  if (!input || typeof input !== "object") {
    return [];
  }

  for (const value of Object.values(input)) {
    const matches = findTaskIdsDeep(value);
    if (matches.length > 0) return matches;
  }

  return [];
}

function findTaskIdsFromString(value) {
  const uuidLikeMatches = value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi);
  if (uuidLikeMatches && uuidLikeMatches.length > 0) return uuidLikeMatches;

  const bracketMatches = value.match(/\[([^\]]+)\]/);
  if (!bracketMatches) return [];

  return bracketMatches[1]
    .split(",")
    .map((item) => item.trim())
    .filter((item) => /^[A-Za-z0-9_-]{8,}$/.test(item));
}

module.exports = {
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
};
