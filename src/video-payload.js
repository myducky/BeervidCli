const { normalizeVideoCreatePayload } = require("./core");
const path = require("path");
const {
  isHttpUrl,
  resolveExistingLocalPath,
  uploadLocalFile,
  uploadRemoteFile,
} = require("./uploads");
const { fail } = require("./validation");

const ASSET_PATH_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".mp4",
  ".mov",
  ".mp3",
  ".wav",
]);

function validateVideoCreatePayload(body, flags = {}) {
  const payload = normalizeVideoCreatePayload(body);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    fail("Video create payload must be a JSON object.", 1);
  }

  const { techType, fragmentList, videoScale } = payload;
  if (!techType) return payload;
  if (!["veo", "sora", "sora_azure", "sora_h_pro", "sora_aio"].includes(techType)) {
    fail("video create techType must be one of: veo, sora, sora_azure, sora_h_pro, sora_aio", 1);
  }

  if (!Array.isArray(fragmentList) || fragmentList.length === 0) {
    fail("video create fragmentList must be a non-empty array.", 1);
  }

  const isSoraFamily = techType !== "veo";

  fragmentList.forEach((fragment, index) => {
    const prefix = `fragmentList[${index}]`;
    if (!fragment || typeof fragment !== "object" || Array.isArray(fragment)) {
      fail(`${prefix} must be an object.`, 1);
    }
    if (typeof fragment.videoContent !== "string" || fragment.videoContent.trim() === "") {
      fail(`${prefix}.videoContent is required.`, 1);
    }
    if (typeof fragment.useCoverFrame !== "boolean") {
      fail(`${prefix}.useCoverFrame must be true or false.`, 1);
    }
    if (!Number.isInteger(fragment.segmentCount)) {
      fail(`${prefix}.segmentCount must be an integer.`, 1);
    }
    if (!["SPLICE", "LONG_TAKE"].includes(fragment.spliceMethod)) {
      fail(`${prefix}.spliceMethod must be SPLICE or LONG_TAKE.`, 1);
    }

    const productReferenceImages = Array.isArray(fragment.productReferenceImages) ? fragment.productReferenceImages : [];
    const nineGridImages = Array.isArray(fragment.nineGridImages) ? fragment.nineGridImages : [];
    const portraitImages = Array.isArray(fragment.portraitImages) ? fragment.portraitImages : [];

    if (techType === "veo" && (fragment.segmentCount < 1 || fragment.segmentCount > 4)) {
      fail(`${prefix}.segmentCount must be 1-4 for veo (1=8s, 2=16s, 3=24s, 4=32s).`, 1);
    }

    if (techType === "veo") {
      if (fragmentList.length === 1 && fragment.segmentCount === 2 && flags["confirm-veo-two-8s"] !== true) {
        fail(
          "veo single-fragment 16s means two internal 8s chapters, not one native 16s take. "
          + "Confirm the user wants two 8s chapters and retry with --confirm-veo-two-8s.",
          1,
        );
      }
      if (productReferenceImages.length > 3) {
        fail(`${prefix}.productReferenceImages allows at most 3 images for veo.`, 1);
      }
      if (portraitImages.length > 1) {
        fail(`${prefix}.portraitImages allows at most 1 image for veo.`, 1);
      }
      if (videoScale === "9:16" && portraitImages.length > 0 && fragment.useCoverFrame !== true) {
        fail(`${prefix}.useCoverFrame must be true for veo when videoScale is 9:16 and portraitImages is provided.`, 1);
      }
      if (fragment.segmentCount === 1 && fragment.spliceMethod === "LONG_TAKE") {
        fail(`${prefix}.spliceMethod LONG_TAKE is not supported for veo when segmentCount is 1.`, 1);
      }
    }

    if (isSoraFamily) {
      if (productReferenceImages.length > 1) {
        fail(`${prefix}.productReferenceImages allows at most 1 image for ${techType}.`, 1);
      }
      if (nineGridImages.length > 9) {
        fail(`${prefix}.nineGridImages allows at most 9 images for ${techType}.`, 1);
      }
      if ((nineGridImages.length > 0 && productReferenceImages.length === 0) || (productReferenceImages.length > 0 && nineGridImages.length === 0)) {
        fail(`${prefix}.nineGridImages and productReferenceImages must both be provided or both be empty for ${techType}.`, 1);
      }
      if (portraitImages.length > 0) {
        fail(`${prefix}.portraitImages must be empty for ${techType}.`, 1);
      }
      if (fragment.useCoverFrame === true) {
        fail(`${prefix}.useCoverFrame must be false for ${techType}.`, 1);
      }
      if (fragment.segmentCount !== 1) {
        fail(`${prefix}.segmentCount must be 1 for ${techType}.`, 1);
      }
      if (fragmentList.length !== 1) {
        fail(`${techType} currently supports a single fragment only; one fragment corresponds to one 15s generation.`, 1);
      }
      if (fragment.spliceMethod === "LONG_TAKE") {
        fail(`${prefix}.spliceMethod LONG_TAKE is not supported for ${techType}.`, 1);
      }
    }
  });

  return payload;
}

async function prepareVideoCreatePayload(config, body, flags = {}, apiRequest) {
  const payload = validateVideoCreatePayload(body, flags);
  const prepared = cloneJson(payload);

  await replaceUploadFieldWithUrls(config, prepared, "bgmList", "audio", flags, apiRequest);
  await replaceUploadFieldWithUrl(config, prepared, "headVideo", "video", flags, apiRequest);
  await replaceUploadFieldWithUrl(config, prepared, "endVideo", "video", flags, apiRequest);

  if (Array.isArray(prepared.fragmentList)) {
    for (const fragment of prepared.fragmentList) {
      if (!fragment || typeof fragment !== "object") continue;
      await replaceUploadFieldWithUrls(config, fragment, "productReferenceImages", "image", flags, apiRequest);
      await replaceUploadFieldWithUrls(config, fragment, "nineGridImages", "image", flags, apiRequest);
      await replaceUploadFieldWithUrls(config, fragment, "portraitImages", "image", flags, apiRequest);
    }
  }

  return prepared;
}

async function replaceUploadFieldWithUrls(config, target, field, fileType, flags, apiRequest) {
  if (!Array.isArray(target[field])) return;
  const uploaded = [];
  for (const item of target[field]) {
    uploaded.push(await uploadAssetValue(config, item, fileType, flags, apiRequest));
  }
  target[field] = uploaded;
}

async function replaceUploadFieldWithUrl(config, target, field, fileType, flags, apiRequest) {
  if (target[field] == null || target[field] === "") return;
  target[field] = await uploadAssetValue(config, target[field], fileType, flags, apiRequest);
}

async function maybeUploadPayloadAsset(config, value, fileType, flags, apiRequest) {
  return uploadAssetValue(config, value, fileType, flags, apiRequest);
}

async function uploadAssetValue(config, value, fileType, flags, apiRequest) {
  if (typeof value === "string") {
    return uploadAssetString(config, value, fileType, flags, apiRequest);
  }
  if (Array.isArray(value)) {
    const uploaded = [];
    for (const item of value) {
      uploaded.push(await uploadAssetValue(config, item, fileType, flags, apiRequest));
    }
    return uploaded;
  }
  if (value && typeof value === "object") {
    const uploaded = { ...value };
    for (const key of ["fileUrl", "fileURL", "url", "src"]) {
      if (typeof uploaded[key] === "string") {
        uploaded[key] = await uploadAssetString(config, uploaded[key], fileType, flags, apiRequest);
      }
    }
    return uploaded;
  }
  return value;
}

async function uploadAssetString(config, value, fileType, flags, apiRequest) {
  const filePath = resolveExistingLocalPath(value);
  if (filePath) {
    if (!flags.quiet) {
      console.error(`Uploading ${fileType}: ${filePath}`);
    }
    return uploadLocalFile({ config, filePath, fileType, apiRequest });
  }
  if (isHttpUrl(value) && flags["upload-remote-assets"]) {
    if (!flags.quiet) {
      console.error(`Uploading ${fileType} from URL: ${value}`);
    }
    return uploadRemoteFile({ config, sourceUrl: value, fileType, apiRequest });
  }
  if (looksLikeLocalAssetPath(value)) {
    fail(`Asset path does not exist: ${value}`, 1);
  }
  return value;
}

function looksLikeLocalAssetPath(value) {
  if (typeof value !== "string" || value.trim() === "") return false;
  if (isHttpUrl(value)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  const ext = path.extname(value).toLowerCase();
  return ASSET_PATH_EXTENSIONS.has(ext) || value.startsWith("./") || value.startsWith("../") || value.startsWith("~/") || value.startsWith("/");
}

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

module.exports = {
  prepareVideoCreatePayload,
  validateVideoCreatePayload,
};
