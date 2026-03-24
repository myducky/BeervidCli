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
  };
  if (options.method !== "GET") headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeout);

  let response;
  try {
    response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
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

module.exports = {
  apiRequest,
  maskApiKey,
};
