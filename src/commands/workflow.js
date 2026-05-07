async function handleWorkflow(subcommand, rest, flags, config, deps) {
  const {
    requireApiKey,
    readJsonInput,
    runEndToEndPublishWorkflow,
    formatOutput,
    printSubcommandHelp,
  } = deps;

  requireApiKey(config);

  if (subcommand === "publish") {
    const publishBody = readJsonInput({ file: flags["publish-file"], stdin: flags["publish-stdin"] });
    const result = await runEndToEndPublishWorkflow({
      config,
      flags,
      videoBody: readJsonInput(flags),
      publishBody,
      ...deps,
    });
    formatOutput({
      flags,
      command: "workflow.publish",
      data: {
        create: result.create,
        task: result.task,
        videos: result.videos,
        publish: result.publish,
        publishTask: result.publishTask,
      },
      textLines: [
        "End-to-end publish workflow completed",
        `task_id: ${result.summary.taskId}`,
        `video_id: ${result.summary.videoId}`,
        `publish_task_id: ${result.summary.publishTaskId}`,
      ],
    });
    return;
  }

  printSubcommandHelp("workflow");
}

module.exports = {
  handleWorkflow,
};
