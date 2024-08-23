/**
 * Escapes special characters in a string for use in a regular expression.
 * @param {string} str - The string to escape.
 * @return {string} The escaped string.
 */
const escape_regex_chars = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Converts a glob pattern to a regular expression pattern.
 * @param {string} pattern - The glob pattern to convert.
 * @param {boolean} extended_glob - Whether to support extended glob syntax.
 * @return {string} The converted regex pattern.
 */
const glob_to_regex_pattern = (pattern, extended_glob) => {
  let in_class = false;
  let in_brace = 0;
  let result = '';

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    switch (char) {
      case '\\':
        result += '\\' + (i + 1 < pattern.length ? pattern[++i] : '\\');
        break;
      case '/':
        result += '\\/';
        break;
      case '[':
        if (!in_class) {
          in_class = true;
          if (pattern[i + 1] === '!') {
            result += '[^';
            i++;
          } else {
            result += '[';
          }
        } else {
          result += '\\[';
        }
        break;
      case ']':
        if (in_class) {
          in_class = false;
          result += ']';
        } else {
          result += '\\]';
        }
        break;
      case '{':
        if (!in_class) {
          in_brace++;
          result += '(';
        } else {
          result += '{';
        }
        break;
      case '}':
        if (!in_class && in_brace > 0) {
          in_brace--;
          result += ')';
        } else {
          result += '}';
        }
        break;
      case ',':
        if (!in_class && in_brace > 0) {
          result += '|';
        } else {
          result += ',';
        }
        break;
      case '*':
        if (!in_class) {
          if (pattern[i + 1] === '*') {
            result += '.*';
            i++;
          } else {
            result += '[^/]*';
          }
        } else {
          result += '\\*';
        }
        break;
      case '?':
        result += in_class ? '\\?' : '[^/]';
        break;
      case '.':
      case '(':
      case ')':
      case '+':
      case '|':
      case '^':
      case '$':
        result += '\\' + char;
        break;
      default:
        result += char;
    }
  }

  if (extended_glob) {
    result = result
      .replace(/\\\+\\\((.*?)\\\)/g, '($1)+')
      .replace(/\\\@\\\((.*?)\\\)/g, '($1)')
      .replace(/\\\!\\\((.*?)\\\)/g, '(?!$1).*')
      .replace(/\\\?\\\((.*?)\\\)/g, '($1)?')
      .replace(/\\\*\\\((.*?)\\\)/g, '($1)*');
  }

  return result;
};

/**
 * Adjusts the regex pattern for Windows paths if necessary.
 * @param {string} pattern - The regex pattern to adjust.
 * @param {boolean} windows_paths - Whether to support Windows paths.
 * @return {string} The adjusted regex pattern.
 */
const adjust_for_windows_paths = (pattern, windows_paths) =>
  windows_paths ? pattern.replace(/\\\//g, '[\\\\/]') : pattern;

/**
 * Creates a RegExp object from the given pattern and options.
 * @param {string} pattern - The glob pattern.
 * @param {Object} options - The options for matching.
 * @return {RegExp} The created RegExp object.
 */
const create_regex = (pattern, { case_sensitive, extended_glob, windows_paths }) => {
  const regex_pattern = glob_to_regex_pattern(pattern, extended_glob);
  const adjusted_pattern = adjust_for_windows_paths(regex_pattern, windows_paths);
  const flags = case_sensitive ? '' : 'i';
  return new RegExp(`^${adjusted_pattern}$`, flags);
};

/**
 * Creates a RegExp object from a glob pattern.
 * @param {string} pattern - The glob pattern to convert.
 * @param {Object} options - The options for creating the regex.
 * @param {boolean} [options.case_sensitive=true] - Whether the regex should be case-sensitive.
 * @param {boolean} [options.extended_glob=false] - Whether to use extended glob syntax.
 * @param {boolean} [options.windows_paths=false] - Whether to support Windows-style paths.
 * @return {RegExp} The created RegExp object.
 */
export function glob_to_regex(pattern, options = {}) {
  const default_options = { case_sensitive: true, extended_glob: false, windows_paths: false };
  const merged_options = { ...default_options, ...options };

  if (pattern === '') {
    return /^$/;
  }

  // Fast path for simple wildcard patterns
  if (pattern === '*' && !merged_options.windows_paths) {
    return /^[^/]+$/;
  }

  if (pattern === '**' && !merged_options.windows_paths) {
    return /^.+$/;
  }

  return create_regex(pattern, merged_options);
}

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