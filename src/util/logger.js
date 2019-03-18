import { TEST_ENV, DEV_ENV } from '../globals';

// alias console methods
const { log: _log } = console;

// Temporarily disable while there's only one module
// eslint-disable-next-line import/prefer-default-export
export const log = {
  always: msg => _log(msg),
  noTest: msg => {
    if (!TEST_ENV) {
      _log(msg);
    }
  },
  error: msg => {
    if (TEST_ENV || DEV_ENV) throw new Error(msg);
    else _log(msg);
  },
};
