const fs = require("fs");
const { printHelp: renderHelp, getHelpLines } = require("./help");

function parseArgs(argv) {
  const positionals = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
      continue;
    }
    if (arg === "--json" || arg === "--verbose" || arg === "--quiet" || arg === "--stdin") {
      flags[arg.slice(2)] = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
      continue;
    }
    positionals.push(arg);
  }

  return { positionals, flags };
}

function readJsonInput(flags, options = {}) {
  if (flags.file) {
    return JSON.parse(fs.readFileSync(flags.file, "utf8"));
  }
  if (flags.stdin) {
    const stdin = fs.readFileSync(0, "utf8");
    return stdin ? JSON.parse(stdin) : {};
  }
  if (options.optional) return undefined;
  fail("Missing JSON input. Use --file <path> or --stdin.", 1);
}

function formatOutput({ flags, command, data, textLines = [] }) {
  if (flags.json) {
    process.stdout.write(`${JSON.stringify({ ok: true, command, data }, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${textLines.join("\n")}\n`);
}

function printHelp() {
  renderHelp();
}

function printSubcommandHelp(topic) {
  process.stdout.write(`${getHelpLines(topic).join("\n")}\n`);
}

function fail(message, exitCode = 1) {
  const error = new Error(message);
  error.exitCode = exitCode;
  throw error;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  parseArgs,
  readJsonInput,
  formatOutput,
  printHelp,
  printSubcommandHelp,
  fail,
  sleep,
};
