import { TEST_ENV, DEV_ENV } from '../globals';

// alias console methods
const { log: _log } = console;

// Environment-dependent logging
export const logError = msg => {
  if (TEST_ENV || DEV_ENV) throw new Error(msg);
  else _log(msg);
};

export const log = msg => {
  if (!TEST_ENV) _log(msg);
};
