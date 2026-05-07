const { parsePositiveInteger } = require("./validation");

function buildListRequest(flags) {
  const request = {
    current: parsePositiveInteger(flags.current, "--current", 1),
    size: parsePositiveInteger(flags.size, "--size", 10),
  };
  if (flags["task-mode"]) request.taskMode = flags["task-mode"];
  return request;
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

function copyOptionalFlag(flags, target, from, to = from, mapValue = (value) => value) {
  if (flags[from] != null) target[to] = mapValue(flags[from]);
}

function copyOptionalCsvFlag(flags, target, from, to = from, mapValue = (value) => value) {
  if (flags[from] == null) return;
  target[to] = String(flags[from]).split(",").map((value) => mapValue(value.trim())).filter((value) => value !== "");
}

module.exports = {
  buildListRequest,
  buildSendRecordsRequest,
  buildStrategyListRequest,
  buildVideoLibraryListRequest,
  copyOptionalFlag,
  copyOptionalCsvFlag,
};
