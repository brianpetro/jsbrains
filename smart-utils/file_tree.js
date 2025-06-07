/**
 * @file file_tree.js
 * @description
 * Pure functional helper that converts a flat list of
 * absolute or relative paths into an ASCII directory tree.
 * Intended for re-use outside the compiler (e.g. system-prompt
 * variable expansion in Smart Chat).
 *
 * Example:
 *   build_file_tree_string(['a/b/c.md','a/b/d.md','x/y.md']);
 *
 * ├── a/
 * │   └── b/
 * │       ├── c.md
 * │       └── d.md
 * └── x/
 *     └── y.md
 */

/**
 * Public: build a tree string.
 * @param {string[]} paths – file *or* folder paths
 * @returns {string} ASCII tree
 */
export function build_file_tree_string(paths = []) {
  if (!Array.isArray(paths) || paths.length === 0) return '';
  const root = {};

  // 1. build nested object structure
  for (const path of paths) {
    const isFolder = is_folder_path(path);
    const parts = path.split('/').filter(Boolean);
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      if (isLast) {
        if (isFolder) {
          node[part] = node[part] ?? { __isExplicitFolder: true };
        } else {
          node[part] = null;
        }
      } else {
        node = node[part] ??= {};
      }
    }
  }

  // 2. compress single-child chains (a/b/c  →  a/b/c), but not explicit folders
  compress_single_child_dirs(root);

  // 3. stringify
  return build_tree_string(root).trimEnd();
}

/* ----------  private helpers ---------- */

function is_folder_path(path) {
  return typeof path === 'string' && path.endsWith('/');
}

function compress_single_child_dirs(node) {
  if (!node || typeof node !== 'object') return;
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (child && typeof child === 'object') {
      // Don't merge if this node or its child is an explicit folder
      if (child.__isExplicitFolder) {
        // Remove marker before stringifying
        delete child.__isExplicitFolder;
        compress_single_child_dirs(child);
        continue;
      }
      const childKeys = Object.keys(child);
      if (
        childKeys.length === 1 &&
        child[childKeys[0]] !== null &&
        !child[childKeys[0]].__isExplicitFolder
      ) {
        const mergedKey = `${key}/${childKeys[0]}`;
        node[mergedKey] = child[childKeys[0]];
        delete node[key];
        compress_single_child_dirs(node[mergedKey]);
      } else {
        compress_single_child_dirs(child);
      }
    }
  }
}

function build_tree_string(node, prefix = '') {
  let output = '';
  const entries = Object.entries(node).sort((a, b) => {
    const aIsDir = a[1] !== null;
    const bIsDir = b[1] !== null;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a[0].localeCompare(b[0]);
  });

  entries.forEach(([name, child], idx) => {
    const isLast = idx === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    if (child === null) {
      output += `${prefix}${connector}${name}\n`;
    } else {
      output += `${prefix}${connector}${name}/\n`;
      output += build_tree_string(child, prefix + (isLast ? '    ' : '│   '));
    }
  });
  return output;
}
