function collectOutput() {
  const calls = [];
  return {
    calls,
    formatOutput(result) {
      calls.push(result);
    },
  };
}

module.exports = {
  collectOutput,
};
