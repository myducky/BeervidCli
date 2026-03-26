async function handleAccounts(subcommand, flags, config, deps) {
  const {
    requireApiKey,
    copyOptionalFlag,
    apiRequest,
    findRecords,
    formatOutput,
    printSubcommandHelp,
  } = deps;

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

module.exports = {
  handleAccounts,
};
