const fs = require("fs");
const os = require("os");
const path = require("path");
const { findDeepValue } = require("./core");
const { fail } = require("./validation");

async function uploadLocalFile({ config, filePath, fileType, apiRequest }) {
  const buffer = fs.readFileSync(filePath);
  validateUploadFile(filePath, fileType);
  return uploadFileContents({
    config,
    buffer,
    fileName: path.basename(filePath),
    fileType,
    sourceLabel: filePath,
    mimeType: mimeTypeForFileName(path.basename(filePath), fileType),
    apiRequest,
  });
}

async function uploadRemoteFile({ config, sourceUrl, fileType, apiRequest }) {
  let response;
  try {
    response = await fetch(sourceUrl);
  } catch (error) {
    const wrapped = new Error(`Failed to download remote ${fileType}: ${error.message}`);
    wrapped.exitCode = 4;
    throw wrapped;
  }
  if (!response.ok) {
    fail(`Failed to download remote ${fileType}: status ${response.status}`, 4);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = inferRemoteFileName(sourceUrl, response.headers.get("content-type"), fileType);
  validateUploadBuffer(buffer, fileName, fileType);
  return uploadFileContents({
    config,
    buffer,
    fileName,
    fileType,
    sourceLabel: sourceUrl,
    mimeType: mimeTypeForRemote(response.headers.get("content-type"), fileName, fileType),
    apiRequest,
  });
}

async function uploadFileContents({ config, buffer, fileName, fileType, sourceLabel, mimeType, apiRequest }) {
  const formData = new FormData();
  formData.set("file", new Blob([buffer], { type: mimeType }), fileName);
  formData.set("fileType", fileType);
  const response = await apiRequest(config, {
    method: "POST",
    path: "/video-create/upload",
    formData,
  });
  const fileUrl = findDeepValue(response.data, ["fileUrl", "url"]);
  if (!fileUrl) {
    fail(`Upload succeeded but no fileUrl was returned for: ${sourceLabel}`, 5);
  }
  return fileUrl;
}

function resolveExistingLocalPath(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (/^https?:\/\//i.test(value)) return null;
  const candidates = [path.resolve(value)];
  if (value.startsWith("~/")) {
    candidates.push(path.join(os.homedir(), value.slice(2)));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

function validateUploadFile(filePath, fileType) {
  const stats = fs.statSync(filePath);
  return validateUploadMeta({
    size: stats.size,
    ext: path.extname(filePath).toLowerCase(),
    fileType,
    sourceLabel: filePath,
  });
}

function validateUploadBuffer(buffer, fileName, fileType) {
  return validateUploadMeta({
    size: buffer.length,
    ext: path.extname(fileName).toLowerCase(),
    fileType,
    sourceLabel: fileName,
  });
}

function validateUploadMeta({ size, ext, fileType, sourceLabel }) {
  const limits = {
    image: { maxSize: 7 * 1024 * 1024, extensions: [".jpg", ".jpeg", ".png"] },
    video: { maxSize: 10 * 1024 * 1024, extensions: [".mp4", ".mov"] },
    audio: { maxSize: 5 * 1024 * 1024, extensions: [".wav", ".mp3"] },
  };
  const rule = limits[fileType];
  if (!rule || !rule.extensions.includes(ext)) {
    fail(`Unsupported ${fileType} extension for ${sourceLabel}: ${ext || "(none)"}`, 1);
  }
  if (size > rule.maxSize) {
    fail(`${fileType} file exceeds size limit of ${Math.floor(rule.maxSize / (1024 * 1024))}MB: ${sourceLabel}`, 1);
  }
}

function inferRemoteFileName(sourceUrl, contentType, fileType) {
  const preferredExtension = extensionForContentType(contentType, fileType);
  try {
    const parsed = new URL(sourceUrl);
    const rawName = path.basename(parsed.pathname);
    const cleanedName = rawName && rawName !== "/" ? rawName : `${fileType}-upload`;
    const currentExtension = path.extname(cleanedName).toLowerCase();
    if (currentExtension && isSupportedUploadExtension(currentExtension, fileType)) return cleanedName;
    const baseName = currentExtension ? cleanedName.slice(0, -currentExtension.length) : cleanedName;
    return `${baseName}${preferredExtension}`;
  } catch (_error) {
    return `${fileType}-upload${preferredExtension}`;
  }
}

function extensionForContentType(contentType, fileType) {
  const normalized = String(contentType || "").toLowerCase();
  if (normalized.includes("jpeg")) return ".jpg";
  if (normalized.includes("png")) return ".png";
  if (normalized.includes("mp4")) return ".mp4";
  if (normalized.includes("quicktime")) return ".mov";
  if (normalized.includes("mpeg")) return ".mp3";
  if (normalized.includes("wav")) return ".wav";
  const defaults = {
    image: ".jpg",
    video: ".mp4",
    audio: ".mp3",
  };
  return defaults[fileType] || "";
}

function isSupportedUploadExtension(ext, fileType) {
  const extensions = {
    image: [".jpg", ".jpeg", ".png"],
    video: [".mp4", ".mov"],
    audio: [".wav", ".mp3"],
  };
  return (extensions[fileType] || []).includes(ext);
}

function mimeTypeForRemote(contentType, fileName, fileType) {
  const normalized = String(contentType || "").toLowerCase().split(";")[0].trim();
  if (normalized) return normalized;
  return mimeTypeForFileName(fileName, fileType);
}

function mimeTypeForFileName(fileName, fileType) {
  const ext = path.extname(fileName).toLowerCase();
  const byExt = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
  };
  if (byExt[ext]) return byExt[ext];
  const defaults = {
    image: "image/jpeg",
    video: "video/mp4",
    audio: "audio/mpeg",
  };
  return defaults[fileType] || "application/octet-stream";
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(value);
}

module.exports = {
  isHttpUrl,
  mimeTypeForFileName,
  resolveExistingLocalPath,
  uploadFileContents,
  uploadLocalFile,
  uploadRemoteFile,
  validateUploadBuffer,
  validateUploadFile,
};
