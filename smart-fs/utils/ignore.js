/**
 * @file ignore.js
 * @description
 * A utility to load .gitignore / .scignore patterns via a SmartFs instance,
 * and check if a file path should be ignored. It also provides a helper
 * function to detect "text files" by extension.
 */

import { match_glob } from './match_glob.js';
import { TEXT_FILE_EXTENSIONS, NO_EXTENSION_TEXT_FILES } from './TEXT_FILE_EXTENSIONS.js';


/**
 * Determine if a file is considered a "text file" by extension.
 * @param {string} file_path - Relative or absolute file path.
 * @returns {boolean}
 */
export function is_text_file(file_path) {
  const last_dot_index = file_path.lastIndexOf('.');
  if (last_dot_index === -1) {
    if(NO_EXTENSION_TEXT_FILES.some(file => file_path.endsWith(file))) {
      return true;
    }
    return false;
  }
  const ext = file_path.substring(last_dot_index).toLowerCase();
  return TEXT_FILE_EXTENSIONS.includes(ext);
}

/**
 * Return the parent folder of 'path_str' given 'sep'. If already top-level or empty, return ''.
 * @param {string} path_str 
 * @param {string} sep 
 * @returns {string}
 */
function get_parent_folder(path_str, sep) {
  if (!path_str) return '';
  const parts = path_str.split(sep).filter(Boolean);
  if (parts.length <= 1) {
    return '';
  }
  parts.pop();
  return parts.join(sep);
}

/**
 * Join segments using 'sep', ignoring empty or '.' segments so that
 * e.g. join_path('/', '.', '.gitignore') => '.gitignore'.
 * @param {string} sep
 * @param {...string} segments
 * @returns {string}
 */
function join_path(sep, ...segments) {
  const filtered = segments
    .map(s => s.trim())
    .filter(s => s && s !== '.');
  return filtered.join(sep);
}

/**
 * Load ignore patterns by traveling upward from 'start_dir' until we can no longer ascend.
 *
 * @param {Object} smart_fs - The SmartFs instance to use for file checks and reads.
 * @param {string} start_dir - Starting directory (relative to the SmartFs root).
 * @param {boolean} [include_parents=false] - Whether to include ignore patterns from parent dirs.
 * @returns {Promise<string[]>} Accumulated ignore patterns.
 */
export async function load_ignore_patterns_smart(smart_fs, start_dir='', include_parents=false) {
  const patterns = [];
  let current_dir = start_dir.trim();

  while (true) {
    await load_ignore_in_directory(smart_fs, current_dir, patterns);
    if (!include_parents) break;
    const parent = get_parent_folder(current_dir, smart_fs.sep);
    if (!parent || parent === current_dir) {
      if (parent === '') {
        await load_ignore_in_directory(smart_fs, '', patterns);
      }
      break;
    }
    current_dir = parent;
  }

  return patterns;
}

/**
 * Look for .scignore / .gitignore in the given directory and parse them into 'patterns'.
 * @param {Object} smart_fs
 * @param {string} dir_path
 * @param {string[]} patterns
 */
async function load_ignore_in_directory(smart_fs, dir_path, patterns) {
  for (const ignore_name of ['.scignore', '.gitignore']) {
    const candidate_path = join_path(smart_fs.sep, dir_path, ignore_name);
    const exists = await smart_fs.adapter.exists(candidate_path);
    if (!exists) continue;

    const content = await smart_fs.adapter.read(candidate_path, 'utf-8');
    if (content && typeof content === 'string') {
      const lines = content.split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line || line.startsWith('#')) {
          continue;
        }
        const expanded = expand_pattern(line);
        for (const p of expanded) {
          if (!patterns.includes(p)) {
            patterns.push(p);
          }
        }
      }
    }
  }
}

/**
 * Expand one line from .gitignore-like files into one or more patterns that match_glob can handle.
 * 
 * - For a bare name (no slash, no leading '/'), we provide a literal match plus subfolder matches.
 * - For a wildcard with no slash (e.g. "*.log"), we add top-level plus subfolder expansions.
 * - A trailing slash is treated as a folder pattern.
 * 
 * @param {string} line
 * @returns {string[]}
 */
export function expand_pattern(line) {
  const rooted = line.startsWith('/');
  let pattern = rooted ? line.slice(1) : line;

  // trailing slash => folder
  const is_dir = pattern.endsWith('/');
  if (is_dir) {
    pattern = pattern.slice(0, -1);
  }
  if (!pattern) {
    // if line was "/" or something empty after trimming
    return [];
  }

  // no slash in the pattern => special expansions
  const has_slash = pattern.includes('/');
  const has_star = pattern.includes('*');

  // we store expansions in an array but skip duplicates
  const expansions = [];

  // Directory expansions (like "foo/") => also match subfolders
  if (is_dir) {
    if (rooted) {
      // e.g. "/foo/"
      expansions.push(`/${pattern}`);
      expansions.push(`/${pattern}/**`);
      return expansions;
    } else if (!has_slash) {
      // e.g. "foo/" => top-level + subfolders
      expansions.push(pattern);
      expansions.push(`${pattern}/**`);
      expansions.push(`**/${pattern}`);
      expansions.push(`**/${pattern}/**`);
      return expansions;
    } else {
      // e.g. "some/folder/"
      expansions.push(pattern);
      expansions.push(`${pattern}/**`);
      if (!rooted) {
        expansions.push(`**/${pattern}`);
        expansions.push(`**/${pattern}/**`);
      }
      return expansions;
    }
  }

  // If not a folder pattern, handle normal expansions:
  if (!rooted && !has_slash) {
    // e.g. "foo", or "*.log"
    if (has_star) {
      // e.g. "*.log" => we want to match top-level AND subfolders
      expansions.push(pattern);
      expansions.push(`**/${pattern}`);
    } else {
      // e.g. "foo"
      expansions.push(pattern);
      expansions.push(`${pattern}/**`);
      expansions.push(`**/${pattern}`);
      expansions.push(`**/${pattern}/**`);
    }
    return expansions;
  }

  // If there's a leading slash but not trailing slash
  if (rooted) {
    // e.g. "/foo" or "/some/folder"
    expansions.push(`/${pattern}`);
    // If it had a wildcard, we keep the same pattern repeated so we don't lose it
    if (has_star) {
      expansions.push(`/${pattern}`);
    }
    return expansions;
  }

  // If it's not rooted but has slash => e.g. "some/folder", or "some/*.log"
  expansions.push(pattern);
  // Also add a "**/" version if we want to match subfolders from root
  expansions.push(`**/${pattern}`);
  // .gitignore patterns should not be expanded
  return expansions;
}

/**
 * Check if 'relative_path' should be ignored given an array of .gitignore-style patterns.
 * This method expands each raw pattern again so that e.g. 'foo' => 'foo', '**\/foo', etc.
 * 
 * @param {string} relative_path
 * @param {string[]} patterns
 * @returns {boolean}
 */
export function should_ignore(relative_path, patterns, aggregator=[]) {
  relative_path = relative_path.replace(/\\/g, '/');
  // Ensure patterns are unique
  patterns = [...new Set([
    ...patterns,
    // Default patterns to ignore common folders and files
    '**/.git/**',
    '.git/**',
    '**/node_modules/**',
    'node_modules/**',
    'package-lock.json',
  ])]; // deduplicated patterns
  for (const raw_pattern of patterns) {
    // Expand each pattern again here, so that
    // a bare 'foo' in patterns can match direct 'foo'
    // or 'folder/foo'.
    const expanded_patterns = expand_pattern(raw_pattern);
    for (const pat of expanded_patterns) {
      if (match_glob(pat, relative_path, { case_sensitive: true })) {
        aggregator.push(pat);
        return true;
      }
    }
  }
  return false;
}
