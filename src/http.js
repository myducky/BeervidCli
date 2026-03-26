const { URL } = require("url");

async function apiRequest(config, options) {
  const url = new URL(`/api/v1/beervid${options.path}`, ensureSlashless(config.baseUrl));
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value != null) url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    "X-API-KEY": config.apiKey,
    ...(options.headers || {}),
  };
  if (options.body != null && options.formData == null && options.rawBody == null) {
    headers["Content-Type"] = "application/json";
  }

  const requestBody = options.formData != null
    ? options.formData
    : options.rawBody != null
      ? options.rawBody
      : options.body != null
        ? JSON.stringify(options.body)
        : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout);

  let response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers,
      body: requestBody,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    const wrapped = new Error(`Request failed: ${error.message}`);
    wrapped.exitCode = 4;
    throw wrapped;
  }
  clearTimeout(timer);

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_error) {
    data = { raw: text };
  }

  if (!response.ok) {
    const message = data.message || data.msg || `Request failed with status ${response.status}`;
    const wrapped = new Error(`${message}\nstatus_code: ${response.status}`);
    wrapped.exitCode = response.status === 401 ? 3 : 4;
    throw wrapped;
  }

  const envelopeFailure = getEnvelopeFailure(data);
  if (envelopeFailure) {
    const wrapped = new Error(envelopeFailure);
    wrapped.exitCode = 4;
    throw wrapped;
  }

  return {
    status: response.status,
    data,
  };
}

function ensureSlashless(baseUrl) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length < 8) return "****";
  return `${apiKey.slice(0, 8)}****${apiKey.slice(-4)}`;
}

function getEnvelopeFailure(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;

  const hasExplicitError = data.error === true || data.success === false;
  const hasNonZeroCode = Number.isFinite(Number(data.code)) && Number(data.code) !== 0;

  if (!hasExplicitError && !hasNonZeroCode) return null;

  const message = data.message || data.msg || "Request failed";
  const codeSuffix = Number.isFinite(Number(data.code)) ? `\ncode: ${data.code}` : "";
  return `${message}${codeSuffix}`;
}

module.exports = {
  apiRequest,
  getEnvelopeFailure,
  maskApiKey,
};
