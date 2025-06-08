/**
 * Creates a RegExp object from the given pattern and options.
 * @param {string} pattern - The glob pattern.
 * @param {Object} options - The options for matching.
 * @return {RegExp} The created RegExp object.
 */
function create_regex(pattern, { case_sensitive, extended_glob, windows_paths }) {
  const regex_pattern = glob_to_regex_pattern(pattern, extended_glob);
  const adjusted_pattern = adjust_for_windows_paths(regex_pattern, windows_paths);
  const flags = case_sensitive ? '' : 'i';
  return new RegExp(`^${adjusted_pattern}$`, flags);
}

/**
 * Adjusts the regex pattern for Windows paths if necessary.
 * @param {string} pattern - The regex pattern to adjust.
 * @param {boolean} windows_paths - Whether to support Windows paths.
 * @return {string} The adjusted regex pattern.
 */
function adjust_for_windows_paths(pattern, windows_paths) {
  return windows_paths
    ? pattern.replace(/\\\//g, '[\\\\/]').replace(/\\\\\\/g, '[\\\\/]')
    : pattern;
}

/**
 * Converts a glob pattern to a regular expression pattern.
 * Includes safeguards for unbalanced brackets and braces.
 * @param {string} pattern - The glob pattern to convert.
 * @param {boolean} extended_glob - Whether to support extended glob syntax.
 * @return {string} The converted regex pattern.
 */
function glob_to_regex_pattern(pattern, extended_glob) {
  let in_class = false;
  let in_brace = 0;
  let result = '';

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    switch (char) {
      case '\\':
        // Escape the backslash plus the next character, if any.
        // If we’re at the last char, just escape the backslash itself.
        if (i + 1 < pattern.length) {
          result += `\\${pattern[i + 1]}`;
          i++;
        } else {
          result += '\\\\';
        }
        break;

      case '/':
        result += '\\/';
        break;

      case '[':
        if (!in_class) {
          // Look ahead to see if we ever find a matching ']' later
          const closingIndex = pattern.indexOf(']', i + 1);
          if (closingIndex === -1) {
            // No matching ']' => treat '[' as literal
            result += '\\[';
          } else {
            // Start a character class
            in_class = true;
            // Check if next char is '!'
            if (pattern[i + 1] === '!') {
              result += '[^';
              i++;
            } else {
              result += '[';
            }
          }
        } else {
          // Already in class => literal '['
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
          const closingIndex = pattern.indexOf('}', i + 1);
          if (closingIndex === -1) {
            result += '\\{';
          } else {
            in_brace++;
            result += '(';
          }
        } else {
          result += '\\{';
        }
        break;

      case '}':
        if (!in_class && in_brace > 0) {
          in_brace--;
          result += ')';
        } else {
          result += '\\}';
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
          // Check for double star '**'
          if (i + 1 < pattern.length && pattern[i + 1] === '*') {
            result += '.*';
            i++;
          } else {
            result += '[^/]*';
          }
        } else {
          // Inside a character class
          result += '\\*';
        }
        break;

      case '?':
        if (!in_class) {
          result += '[^/]';
        } else {
          result += '\\?';
        }
        break;

      // We escape these to ensure they remain literal
      case '(':
      case ')':
      case '+':
      case '|':
      case '^':
      case '$':
      case '.':
        result += `\\${char}`;
        break;

      default:
        // Ordinary character => just append
        result += char;
        break;
    }
  }

  // If we ended still inside a bracket class, close it
  if (in_class) {
    result += ']';
    in_class = false;
  }

  // If extended glob is on, rewrite certain tokens
  if (extended_glob) {
    result = result
      // +(...)
      .replace(/\\\+\\\((.*?)\\\)/g, '($1)+')
      // @(...)
      .replace(/\\\@\\\((.*?)\\\)/g, '($1)')
      // !(...)
      .replace(/\\\!\\\((.*?)\\\)/g, '(?!$1).*')
      // ?(...)
      .replace(/\\\?\\\((.*?)\\\)/g, '($1)?')
      // *(...)
      .replace(/\\\*\\\((.*?)\\\)/g, '($1)*');
  }

  return result;
}

/**
 * Creates a RegExp object from a glob pattern.
 * @param {string} pattern - The glob pattern to convert.
 * @param {Object} [options] - The options for creating the regex.
 * @param {boolean} [options.case_sensitive=true] - Whether the regex should be case-sensitive.
 * @param {boolean} [options.extended_glob=false] - Whether to use extended glob syntax.
 * @param {boolean} [options.windows_paths=false] - Whether to support Windows-style paths.
 * @return {RegExp} The created RegExp object.
 */
export function glob_to_regex(pattern, options = {}) {
  const default_options = {
    case_sensitive: true,
    extended_glob: false,
    windows_paths: false
  };
  const merged_options = { ...default_options, ...options };

  if (pattern === '') {
    // Empty pattern => matches empty string
    return /^$/;
  }

  // Quick path for single-asterisk
  if (pattern === '*' && !merged_options.windows_paths) {
    return /^[^/]+$/;
  }

  // Quick path for double-asterisk
  if (pattern === '**' && !merged_options.windows_paths) {
    return /^.+$/;
  }

  return create_regex(pattern, merged_options);
}
