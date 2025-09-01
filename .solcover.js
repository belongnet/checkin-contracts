const shell = require('shelljs');

module.exports = {
  istanbulReporter: ['html'],
  onCompileComplete: async function (_config) {
    await run('typechain');
  },
  onIstanbulComplete: async function (_config) {
    // We need to do this because solcover generates bespoke artifacts.
    shell.rm('-rf', './artifacts');
    shell.rm('-rf', './typechain');
  },
  skipFiles: ['mocks', 'v1', 'v2/tokens/LONG.sol'],
};
