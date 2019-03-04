import { TEST_ENV, DEV_ENV } from '../globals';

// alias console methods
export const { log, warn } = console;

// Environment-dependent logging
export const logError = msg => {
  if (TEST_ENV || DEV_ENV) throw new Error(msg);
  else log(msg);
};
