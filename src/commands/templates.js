async function handleLabels(subcommand, flags, config, deps) {
  const {
    requireApiKey,
    printSubcommandHelp,
    apiRequest,
    findRecords,
    formatOutput,
  } = deps;

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

async function handleTemplates(subcommand, flags, config, deps) {
  const {
    requireApiKey,
    apiRequest,
    findRecords,
    formatOutput,
    fail,
    findDeepValue,
    printSubcommandHelp,
  } = deps;

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

module.exports = {
  handleLabels,
  handleTemplates,
};
