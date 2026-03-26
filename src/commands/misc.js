async function handleRaw(subcommand, rest, flags, config, deps) {
  const {
    requireApiKey,
    fail,
    apiRequest,
    readJsonInput,
    formatOutput,
  } = deps;

  requireApiKey(config);
  const targetPath = rest[0];
  if (!targetPath) fail("Usage: beervid raw <get|post> <path> [--file payload.json]", 1);

  const method = subcommand && subcommand.toUpperCase();
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    fail("Usage: beervid raw <get|post|put|patch|delete> <path> [--file payload.json]", 1);
  }

  const response = await apiRequest(config, {
    method,
    path: targetPath.startsWith("/") ? targetPath : `/${targetPath}`,
    body: method === "GET" ? undefined : readJsonInput(flags, { optional: true }),
  });

  formatOutput({
    flags: { ...flags, json: true },
    command: `raw.${subcommand}`,
    data: response.data,
  });
}

function handleCompletion(subcommand, deps) {
  const { printSubcommandHelp } = deps;

  if (subcommand !== "zsh" && subcommand !== "bash" && subcommand !== "fish") {
    printSubcommandHelp("completion");
    return;
  }
  const scripts = {
    zsh: "#compdef beervid\n_arguments '*::arg:->args'",
    bash: "complete -W 'auth accounts labels templates video publish raw completion' beervid",
    fish: "complete -c beervid -f -a 'auth accounts labels templates video publish raw completion'",
  };
  process.stdout.write(`${scripts[subcommand]}\n`);
}

module.exports = {
  handleRaw,
  handleCompletion,
};
