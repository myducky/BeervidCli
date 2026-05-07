async function runVideoWorkflow({
  config,
  flags,
  body,
  prepareVideoCreatePayload,
  apiRequest,
  findTaskId,
  watchTask,
  isSuccessStatus,
  buildVideoLibraryListRequest,
  findRecords,
}) {
  const preparedBody = await prepareVideoCreatePayload(config, body, flags);
  const created = await apiRequest(config, {
    method: "POST",
    path: "/video-create",
    body: preparedBody,
  });
  const taskId = findTaskId(created.data);
  if (!taskId) {
    const error = new Error("Unable to determine task_id from video create response");
    error.exitCode = 5;
    throw error;
  }

  const watched = await watchTask(config, taskId, flags);
  if (isSuccessStatus && !isSuccessStatus(watched)) {
    const error = new Error(`Video task failed: ${watched.errorMessage || watched.status || taskId}`);
    error.exitCode = 5;
    throw error;
  }
  const listed = await apiRequest(config, {
    method: "POST",
    path: "/videos/library/list",
    body: buildVideoLibraryListRequest({ ...flags, "task-ids": taskId }),
  });
  const records = findRecords(listed.data);

  return {
    create: created.data,
    task: watched,
    videos: listed.data,
    summary: {
      taskId,
      status: watched && watched.status,
      latestVideoId: records[0] ? records[0].id || records[0].videoId || "unknown" : "unknown",
    },
  };
}

module.exports = {
  runVideoWorkflow,
};
