async function handleVideo(subcommand, rest, flags, config, deps) {
  const {
    requireApiKey,
    prepareVideoCreatePayload,
    readJsonInput,
    apiRequest,
    findTaskId,
    formatOutput,
    findStatus,
    fail,
    fs,
    path,
    validateUploadFile,
    mimeTypeForFileName,
    findDeepValue,
    printSubcommandHelp,
    buildVideoLibraryListRequest,
    findRecords,
    normalizeVideoPublishPayload,
    runVideoWorkflow,
    handleVideoData,
    handleVideoTasks,
  } = deps;

  requireApiKey(config);

  if (subcommand === "create") {
    const body = await prepareVideoCreatePayload(config, readJsonInput(flags), flags);
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
    formData.set(
      "file",
      new Blob([fs.readFileSync(filePath)], { type: mimeTypeForFileName(path.basename(filePath), fileType) }),
      path.basename(filePath),
    );
    formData.set("fileType", fileType);
    const response = await apiRequest(config, {
      method: "POST",
      path: "/video-create/upload",
      formData,
    });
    if (response.data && (response.data.error === true || response.data.success === false || Number(response.data.code) !== 0)) {
      fail(response.data.message || `Upload failed for: ${filePath}`, 4);
    }
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
    return handleVideoTasks(rest[0], flags, config, deps);
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
    return handleVideoData(rest[0], flags, config, deps);
  }

  if (subcommand === "run") {
    const result = await runVideoWorkflow({
      config,
      flags,
      body: readJsonInput(flags),
      prepareVideoCreatePayload,
      apiRequest,
      findTaskId,
      watchTask: deps.watchTask,
      buildVideoLibraryListRequest,
      findRecords,
    });
    formatOutput({
      flags,
      command: "video.run",
      data: {
        create: result.create,
        task: result.task,
        videos: result.videos,
      },
      textLines: [
        "Video workflow completed",
        `task_id: ${result.summary.taskId}`,
        `status: ${findStatus(result.task) || "success"}`,
        `latest_video_id: ${result.summary.latestVideoId}`,
      ],
    });
    return;
  }

  printSubcommandHelp("video");
}

async function handleVideoData(subcommand, flags, config, deps) {
  const {
    printSubcommandHelp,
    fail,
    apiRequest,
    formatOutput,
    findDeepValue,
  } = deps;

  if (subcommand !== "get") {
    printSubcommandHelp("video");
    return;
  }

  const id = flags.id;
  if (!id) fail("Usage: beervid video data get --id <video_id>", 1);
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

async function handleVideoTasks(subcommand, flags, config, deps) {
  const {
    copyOptionalFlag,
    apiRequest,
    findRecords,
    formatOutput,
    formatTaskStatus,
    fail,
    getTask,
    watchTask,
    isSuccessStatus,
    printSubcommandHelp,
  } = deps;

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

module.exports = {
  handleVideo,
  handleVideoData,
  handleVideoTasks,
};
