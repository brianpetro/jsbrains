import { glob_to_regex } from "./glob_to_regex.js";


/**
 * Matches a string against a glob pattern.
 * @param {string} pattern - The glob pattern to match against.
 * @param {string} str - The string to test.
 * @param {Object} options - The options for matching.
 * @param {boolean} [options.case_sensitive=true] - Whether the match should be case-sensitive.
 * @param {boolean} [options.extended_glob=false] - Whether to use extended glob syntax.
 * @param {boolean} [options.windows_paths=false] - Whether to support Windows-style paths.
 * @return {boolean} True if the string matches the pattern, false otherwise.
 */
export function match_glob(pattern, str, options = {}) {
  const regex = glob_to_regex(pattern, options);
  return regex.test(str);
}