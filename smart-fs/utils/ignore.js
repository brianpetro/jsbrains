/**
 * @file ignore_utility.js
 * @description
 * A utility to load .gitignore / .scignore patterns from directories and check if
 * a file path should be ignored. It also provides a helper for detecting whether
 * a given path is a text file.
 */

import fs from 'fs';
import path from 'path';
import { match_glob } from './match_glob.js';

/**
 * An array of recognized text file extensions.
 * Add or remove items here to customize what counts as a "text file."
 * @type {string[]}
 */
const TEXT_FILE_EXTENSIONS = [
  '.asm', '.bat', '.c', '.cfg', '.clj', '.conf', '.cpp', '.cs', '.css', '.csv',
  '.d', '.dart', '.ejs', '.elm', '.erl', '.f', '.go', '.gradle', '.groovy', '.h',
  '.hbs', '.hpp', '.hs', '.html', '.ini', '.jade', '.java', '.js', '.json', '.jsx',
  '.kt', '.less', '.lisp', '.log', '.lua', '.m', '.makefile', '.md', '.mdx', '.ml',
  '.mjs', '.mustache', '.pas', '.php', '.pl', '.properties', '.pug', '.py', '.r',
  '.rb', '.rs', '.sass', '.scala', '.scheme', '.scss', '.sh', '.sql', '.svelte',
  '.swift', '.tcl', '.tex', '.tpl', '.ts', '.tsx', '.twig', '.txt', '.vb', '.vue',
  '.xml', '.yaml', '.yml',
  '.canvas' // For Obsidian-like usage, if desired
];

/**
 * Determine if a file is considered a "text file" by extension.
 * @param {string} file_path - Absolute or relative file path.
 * @returns {boolean}
 */
export function is_text_file(file_path) {
  const ext = path.extname(file_path).toLowerCase();
  return TEXT_FILE_EXTENSIONS.includes(ext);
}

/**
 * Recursively loads all ignore patterns from .gitignore or .scignore files
 * found in the directory or any ancestor directories, until reaching the file system root.
 *
 * - Blank lines and comment lines (# comment) are skipped.
 * - Every other line is treated as a glob pattern for `match_glob`.
 *
 * @param {string} start_dir - The directory where we start looking for ignore files.
 * @returns {string[]} An array of glob patterns loaded from the found ignore files.
 */
export function load_ignore_patterns(start_dir) {
  const patterns = [];
  let current_dir = start_dir;

  while (true) {
    // If there's no valid directory left, stop
    if (!current_dir || current_dir.trim() === '' || current_dir === path.parse(current_dir).root) {
      break;
    }

    // Collect patterns from .scignore and .gitignore if present
    for (const ignore_name of ['.scignore', '.gitignore']) {
      const candidate_path = path.join(current_dir, ignore_name);
      if (fs.existsSync(candidate_path) && fs.statSync(candidate_path).isFile()) {
        const lines = fs.readFileSync(candidate_path, 'utf8').split('\n');
        for (let line of lines) {
          line = line.trim();
          if (!line || line.startsWith('#')) {
            // Skip blank lines or comment lines
            continue;
          }
          const expanded = expand_pattern(line);
          patterns.push(...expanded);
        }
      }
    }

    const parent_dir = path.dirname(current_dir);
    if (!parent_dir || parent_dir === current_dir) {
      break;
    }
    current_dir = parent_dir;
  }
  return patterns;
}

/**
 * Given a single line from a .gitignore/.scignore,
 * if it is a bare name (no slash/wildcard), interpret it as
 * [ "node_modules", "node_modules/**" ].
 * if node_modules/ then also add node_modules/**
 * Otherwise, keep it as-is.
 */
function expand_pattern(line) {
  // If the line has wildcard, keep it
  if (/[/*?]/.test(line)) {
    return [line];
  }

  // If it ends with a slash, treat it as a directory
  if (line.endsWith('/')) {
    const base = line.slice(0, -1); // Remove trailing slash
    return [base, base + '/**'];
  }

  // Otherwise (bare word):
  // e.g. "node_modules" => [ "node_modules", "node_modules/**" ]
  return [line, line + '/**'];
}

/**
 * Checks if a given relative path is ignored by any of the provided glob patterns.
 *
 * @param {string} relative_path - The path (relative to wherever you want) to test.
 * @param {string[]} patterns - An array of ignore patterns loaded by load_ignore_patterns().
 * @returns {boolean} True if any pattern matches the path, otherwise false.
 */
export function should_ignore(relative_path, patterns) {
  for (const pattern of patterns) {
    // If the path matches the pattern, we ignore it
    // We’ll assume standard (case-sensitive) matching for typical .gitignore usage
    if (match_glob(pattern, relative_path, { case_sensitive: true })) {
      return true;
    }
  }
  return false;
}