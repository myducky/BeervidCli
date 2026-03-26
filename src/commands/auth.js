async function handleAuth(subcommand, rest, flags, config, deps) {
  const {
    fail,
    saveApiKey,
    formatOutput,
    getConfigPath,
    maskApiKey,
    requireApiKey,
    apiRequest,
    findDeepValue,
    clearApiKey,
    printSubcommandHelp,
  } = deps;

  switch (subcommand) {
    case "set-key": {
      const apiKey = rest[0];
      if (!apiKey) fail("Usage: beervid auth set-key <api_key>", 1);
      saveApiKey(apiKey, flags);
      formatOutput({
        flags,
        command: "auth.set-key",
        data: {
          message: "API key saved successfully",
          configPath: getConfigPath(flags),
        },
        textLines: [
          "API key saved successfully",
          `config: ${getConfigPath(flags)}`,
        ],
      });
      return;
    }
    case "status": {
      formatOutput({
        flags,
        command: "auth.status",
        data: {
          configured: Boolean(config.apiKey),
          baseUrl: config.baseUrl,
          apiKey: config.apiKey ? maskApiKey(config.apiKey) : null,
        },
        textLines: config.apiKey
          ? [
              "Authentication configured",
              `base_url: ${config.baseUrl}`,
              `api_key: ${maskApiKey(config.apiKey)}`,
            ]
          : [
              "Authentication not configured",
              `config: ${getConfigPath(flags)}`,
            ],
      });
      return;
    }
    case "test": {
      requireApiKey(config);
      const checkResponse = await apiRequest(config, {
        method: "GET",
        path: "/check",
      });
      const profileResponse = await apiRequest(config, {
        method: "GET",
        path: "/profile",
      });
      formatOutput({
        flags,
        command: "auth.test",
        data: {
          ok: true,
          baseUrl: config.baseUrl,
          check: checkResponse.data,
          profile: profileResponse.data,
        },
        textLines: [
          "Authentication test passed",
          `base_url: ${config.baseUrl}`,
          `status: ${findDeepValue(checkResponse.data, ["status"]) || "authenticated"}`,
          `username: ${findDeepValue(profileResponse.data, ["username"]) || findDeepValue(checkResponse.data, ["username"]) || "unknown"}`,
        ],
      });
      return;
    }
    case "check": {
      requireApiKey(config);
      const response = await apiRequest(config, {
        method: "GET",
        path: "/check",
      });
      formatOutput({
        flags,
        command: "auth.check",
        data: response.data,
        textLines: [
          "Authentication status",
          `status: ${findDeepValue(response.data, ["status"]) || "unknown"}`,
          `username: ${findDeepValue(response.data, ["username"]) || "unknown"}`,
        ],
      });
      return;
    }
    case "profile": {
      requireApiKey(config);
      const response = await apiRequest(config, {
        method: "GET",
        path: "/profile",
      });
      formatOutput({
        flags,
        command: "auth.profile",
        data: response.data,
        textLines: [
          "Profile",
          `user_id: ${findDeepValue(response.data, ["userId"]) || "unknown"}`,
          `username: ${findDeepValue(response.data, ["username"]) || "unknown"}`,
          `email: ${findDeepValue(response.data, ["email"]) || "-"}`,
          `membership: ${findDeepValue(response.data, ["membershipTierCode"]) || "-"}`,
          `api_key_name: ${findDeepValue(response.data, ["apiKeyName"]) || "-"}`,
        ],
      });
      return;
    }
    case "clear": {
      clearApiKey(flags);
      formatOutput({
        flags,
        command: "auth.clear",
        data: { message: "API key removed" },
        textLines: ["API key removed"],
      });
      return;
    }
    default:
      printSubcommandHelp("auth");
  }
}

module.exports = {
  handleAuth,
};
