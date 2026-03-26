async function handlePublish(subcommand, rest, flags, config, deps) {
  const {
    requireApiKey,
    resolveCreatorUserOpenId,
    readJsonInput,
    apiRequest,
    findRecords,
    formatOutput,
    handlePublishStrategy,
    buildSendRecordsRequest,
    runPublishWorkflow,
    normalizeStrategyPayload,
    findStrategyId,
    toggleStrategy,
    findEnabledState,
    formatEnabledState,
    printSubcommandHelp,
  } = deps;

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
    return handlePublishStrategy(rest[0], flags, config, deps);
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
    const result = await runPublishWorkflow({
      config,
      body: readJsonInput(flags),
      apiRequest,
      normalizeStrategyPayload,
      findStrategyId,
      toggleStrategy,
      findEnabledState,
      formatEnabledState,
    });
    formatOutput({
      flags,
      command: "publish.run",
      data: { create: result.create, enable: result.enable },
      textLines: [
        "Publish workflow completed",
        `strategy_id: ${result.summary.strategyId}`,
        `status: ${result.summary.status}`,
      ],
    });
    return;
  }

  printSubcommandHelp("publish");
}

async function handlePublishStrategy(subcommand, flags, config, deps) {
  const {
    apiRequest,
    buildStrategyListRequest,
    findRecords,
    formatOutput,
    formatEnabledState,
    findEnabledState,
    fail,
    findName,
    readJsonInput,
    normalizeStrategyPayload,
    findStrategyId,
    toggleStrategy,
    printSubcommandHelp,
  } = deps;

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

module.exports = {
  handlePublish,
  handlePublishStrategy,
};
