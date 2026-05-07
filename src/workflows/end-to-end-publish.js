function createCliError(message, exitCode = 1) {
  const error = new Error(message);
  error.exitCode = exitCode;
  return error;
}

async function runEndToEndPublishWorkflow({
  config,
  flags,
  videoBody,
  publishBody,
  prepareVideoCreatePayload,
  apiRequest,
  findTaskId,
  findDeepValue,
  normalizeVideoPublishPayload,
  watchTask,
  isSuccessStatus,
  buildVideoLibraryListRequest,
  findRecords,
}) {
  const preparedVideoBody = await prepareVideoCreatePayload(config, videoBody, flags);
  const created = await apiRequest(config, {
    method: "POST",
    path: "/video-create",
    body: preparedVideoBody,
  });
  const taskId = findTaskId(created.data);
  if (!taskId) {
    throw createCliError("Unable to determine task_id from video create response", 5);
  }

  const task = await watchTask(config, taskId, flags);
  if (isSuccessStatus && !isSuccessStatus(task)) {
    throw createCliError(`Video task failed: ${task.errorMessage || task.status || taskId}`, 5);
  }
  const listed = await apiRequest(config, {
    method: "POST",
    path: "/videos/library/list",
    body: buildVideoLibraryListRequest({ ...flags, "task-ids": taskId }),
  });
  const records = findRecords(listed.data);
  const videoId = resolveVideoId(records, flags);
  if (!videoId) {
    throw createCliError("Unable to determine video_id from video library response", 5);
  }

  const publishRequestBody = normalizeVideoPublishPayload({
    ...publishBody,
    videoId,
  });
  const publish = await apiRequest(config, {
    method: "POST",
    path: "/videos/library/publish",
    body: publishRequestBody,
  });
  const publishTaskId = findDeepValue(publish.data, ["publishTaskId", "publish_task_id", "id"]);
  if (!publishTaskId && !flags["skip-publish-data"]) {
    throw createCliError("Unable to determine publish_task_id from video publish response", 5);
  }

  const publishTask = publishTaskId && !flags["skip-publish-data"]
    ? await apiRequest(config, {
        method: "GET",
        path: `/video/publish-task/${publishTaskId}`,
      })
    : null;

  return {
    create: created.data,
    task,
    videos: listed.data,
    publish: publish.data,
    publishTask: publishTask ? publishTask.data : null,
    summary: {
      taskId,
      videoId,
      publishTaskId: publishTaskId || "unknown",
    },
  };
}

function resolveVideoId(records, flags) {
  if (flags["video-id"]) return flags["video-id"];
  const selected = records[0];
  if (!selected) return null;
  return selected.id || selected.videoId || selected.video_id || null;
}

module.exports = {
  runEndToEndPublishWorkflow,
};
