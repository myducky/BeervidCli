function createCliError(message, exitCode = 1) {
  const error = new Error(message);
  error.exitCode = exitCode;
  return error;
}

function fail(message, exitCode = 1) {
  throw createCliError(message, exitCode);
}

function parsePositiveInteger(value, flagName, defaultValue) {
  const raw = value == null || value === "" ? defaultValue : value;
  const number = Number(raw);
  if (!Number.isInteger(number) || number <= 0) {
    fail(`${flagName} must be a positive integer.`, 1);
  }
  return number;
}

function parsePositiveNumber(value, flagName, defaultValue) {
  const raw = value == null || value === "" ? defaultValue : value;
  const number = Number(raw);
  if (!Number.isFinite(number) || number <= 0) {
    fail(`${flagName} must be a positive number.`, 1);
  }
  return number;
}

function parseNonNegativeNumber(value, flagName, defaultValue = 0) {
  const raw = value == null || value === "" ? defaultValue : value;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) {
    fail(`${flagName} must be a non-negative number.`, 1);
  }
  return number;
}

module.exports = {
  createCliError,
  fail,
  parseNonNegativeNumber,
  parsePositiveInteger,
  parsePositiveNumber,
};
