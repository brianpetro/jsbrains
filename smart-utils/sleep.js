/**
 * Delay execution for a number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
