const fs = require("fs");
const os = require("os");
const path = require("path");
const { fail, parsePositiveNumber } = require("./validation");

function getConfigPath(flags = {}) {
  if (flags["config-path"]) return path.resolve(flags["config-path"]);
  return path.join(os.homedir(), ".config", "beervid", "config.json");
}

function loadConfig(flags = {}) {
  const configPath = getConfigPath(flags);
  let fileConfig = {};
  if (fs.existsSync(configPath)) {
    fileConfig = readConfigJson(configPath);
  }

  return {
    apiKey: flags["api-key"] || process.env.BEERVID_API_KEY || fileConfig.api_key || null,
    baseUrl: flags["base-url"] || process.env.BEERVID_BASE_URL || fileConfig.base_url || "https://open.beervid.ai",
    timeout: parsePositiveNumber(flags.timeout || process.env.BEERVID_TIMEOUT || fileConfig.timeout, "--timeout", 30000),
    pollInterval: parsePositiveNumber(process.env.BEERVID_POLL_INTERVAL || fileConfig.poll_interval, "BEERVID_POLL_INTERVAL", 5),
    output: flags.json ? "json" : (process.env.BEERVID_OUTPUT || fileConfig.output || "text"),
  };
}

function saveApiKey(apiKey, flags = {}) {
  const configPath = getConfigPath(flags);
  ensureConfigDir(configPath);
  let fileConfig = {};
  if (fs.existsSync(configPath)) {
    fileConfig = readConfigJson(configPath);
  }
  fileConfig.api_key = apiKey;
  if (!fileConfig.base_url) fileConfig.base_url = "https://open.beervid.ai";
  fs.writeFileSync(configPath, `${JSON.stringify(fileConfig, null, 2)}\n`);
}

function clearApiKey(flags = {}) {
  const configPath = getConfigPath(flags);
  if (!fs.existsSync(configPath)) return;
  const fileConfig = readConfigJson(configPath);
  delete fileConfig.api_key;
  fs.writeFileSync(configPath, `${JSON.stringify(fileConfig, null, 2)}\n`);
}

function ensureConfigDir(configPath) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

function readConfigJson(configPath) {
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    fail(`Invalid config file ${configPath}: ${error.message}`, 1);
  }
}

module.exports = {
  loadConfig,
  saveApiKey,
  clearApiKey,
  getConfigPath,
};
