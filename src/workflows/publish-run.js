async function runPublishWorkflow({
  config,
  body,
  apiRequest,
  normalizeStrategyPayload,
  findStrategyId,
  toggleStrategy,
  findEnabledState,
  formatEnabledState,
}) {
  const created = await apiRequest(config, {
    method: "POST",
    path: "/strategies/create",
    body: normalizeStrategyPayload(body),
  });
  const strategyId = findStrategyId(created.data);
  if (!strategyId) {
    const error = new Error("Unable to determine strategy_id from create response");
    error.exitCode = 5;
    throw error;
  }

  const enabled = await toggleStrategy(config, strategyId);
  const actualState = formatEnabledState(findEnabledState(enabled.data));

  return {
    create: created.data,
    enable: enabled.data,
    summary: {
      strategyId,
      status: actualState || "unknown",
    },
  };
}

module.exports = {
  runPublishWorkflow,
};
