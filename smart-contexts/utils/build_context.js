/**
 * @file build_context.js
 * @description
 * Builds a final context string and stats object from an in-memory set of items and optional links,
 * wrapping them in user-supplied templates. Exclusion logic is handled externally in `respect_exclusions.js`.
 *
 * Follows a functional approach:
 *   1. build_primary_items
 *   2. build_secondary_links
 *   3. wrap_final_output
 * with user-defined templates for each stage.
 *
 * @module build_context
 */

/**
 * @typedef {Object} BuildResultStats
 * @property {number} item_count - Count of items processed
 * @property {number} link_count - Count of links processed
 * @property {number} char_count - Length of the final compiled string
 */

/**
 * @typedef {Object} BuildResult
 * @property {string} context - The final compiled string
 * @property {BuildResultStats} stats - Statistics about items, links, and character count
 */

/**
 * @typedef {Object} BuildContextOptions
 * @property {Record<string, string>} [items] - Main items (filename/path -> content)
 * @property {Record<string, object>} [links] - Link objects, each can contain:
 *    {
 *      to?: string[],
 *      from?: string[],
 *      content: string,
 *      type?: string[],
 *      depth?: number[]
 *    }
 * @property {string} [before_context] - Text placed at start of the entire context
 * @property {string} [after_context] - Text placed at end of the entire context
 * @property {string} [before_item] - Text inserted before each item's content
 * @property {string} [after_item] - Text inserted after each item's content
 * @property {string} [before_link] - Text inserted before each link's content
 * @property {string} [after_link] - Text inserted after each link's content
 */

/**
 * build_context
 * Creates a final text by combining:
 *   - `items` with optional before/after_item templates
 *   - `links` with optional before/after_link templates
 * Then wraps the result with `before_context` and `after_context`.
 * Also injects a file tree if {{FILE_TREE}} is in a template.
 *
 * @async
 * @param {BuildContextOptions} opts
 * @returns {Promise<BuildResult>}
 */
export async function build_context(opts = {}) {
  const {
    items = {},
    links = {},
    before_context = '',
    after_context = '',
    before_item = '',
    after_item = '',
    before_link = '',
    after_link = '',
  } = opts;

  const file_tree_string = create_file_tree_string(Object.keys(items), Object.keys(links));

  // Build items
  const primary_output = build_primary_items(items, before_item, after_item);

  // Build links
  const secondary_output = build_secondary_links(links, before_link, after_link);

  // Wrap everything up
  const { combined, stats } = wrap_final_output({
    items,
    links,
    primary_output,
    secondary_output,
    before_context,
    after_context,
    file_tree_string
  });

  return {
    context: combined,
    stats
  };
}

/**
 * build_primary_items
 * @param {Record<string, string>} items
 * @param {string} before_item
 * @param {string} after_item
 * @returns {string} Combined text of all items, each with optional before/after_item
 */
function build_primary_items(items, before_item, after_item) {
  let output = '';
  for (const [item_path, item_content] of Object.entries(items)) {
    const item_vars = {
      ITEM_PATH: item_path,
      ITEM_NAME: item_path.substring(item_path.lastIndexOf('/') + 1),
      ITEM_EXT: item_path.substring(item_path.lastIndexOf('.') + 1)
    };

    if (before_item) {
      output += replace_vars(before_item, item_vars) + '\n';
    }
    output += (item_content || '').trim() + '\n';
    if (after_item) {
      output += replace_vars(after_item, item_vars) + '\n';
    }
  }
  return output;
}

/**
 * build_secondary_links
 * @param {Record<string, any>} links
 * @param {string} before_link
 * @param {string} after_link
 * @returns {string} Combined text of all links, each with optional before/after_link
 */
function build_secondary_links(links, before_link, after_link) {
  let output = '';
  for (const [link_key, link_obj] of Object.entries(links)) {
    if (!link_obj) continue;
    const { to, from, content, type, depth } = link_obj;

    let item_key = '';
    if (to && to[0]) item_key = to[0];
    else if (from && from[0]) item_key = from[0];

    const link_vars = {
      LINK_PATH: link_key,
      LINK_NAME: link_key.substring(link_key.lastIndexOf('/') + 1),
      LINK_TYPE: type?.[0] || '',
      LINK_DEPTH: depth?.[0] || 0,
      LINK_EXT: link_key.substring(link_key.lastIndexOf('.') + 1),
      LINK_ITEM_PATH: item_key,
      LINK_ITEM_NAME: item_key ? item_key.substring(item_key.lastIndexOf('/') + 1) : '',
      LINK_ITEM_EXT: item_key ? item_key.substring(item_key.lastIndexOf('.') + 1) : ''
    };

    if (before_link) {
      output += replace_vars(before_link, link_vars) + '\n';
    }
    output += (content || '').trim() + '\n';
    if (after_link) {
      output += replace_vars(after_link, link_vars) + '\n';
    }
  }
  return output;
}

/**
 * wrap_final_output
 * Wraps primary and secondary output with top-level templates, injects FILE_TREE if used,
 * and calculates stats based on total items and links.
 *
 * @param {object} arg
 * @param {Record<string,string>} arg.items
 * @param {Record<string,any>} arg.links
 * @param {string} arg.primary_output
 * @param {string} arg.secondary_output
 * @param {string} arg.before_context
 * @param {string} arg.after_context
 * @param {string} arg.file_tree_string
 * @returns {{combined: string, stats: BuildResultStats}}
 */
function wrap_final_output({
  items,
  links,
  primary_output,
  secondary_output,
  before_context,
  after_context,
  file_tree_string
}) {
  let combined = '';
  const stats = {
    item_count: Object.keys(items).length,
    link_count: Object.keys(links).length,
    char_count: 0
  };

  if (before_context) {
    combined += replace_vars(before_context, { FILE_TREE: file_tree_string }) + '\n';
  }
  combined += primary_output;
  combined += secondary_output;
  if (after_context) {
    combined += replace_vars(after_context, { FILE_TREE: file_tree_string }) + '\n';
  }

  combined = combined.trim();
  stats.char_count = combined.length;
  return { combined, stats };
}

/**
 * create_file_tree_string
 * Builds a directory/file tree from given paths. If a path is 'folder/sub/file.md':
 * - 'folder' is a directory with child 'sub'
 * - 'sub' is a directory with child 'file.md'
 *
 * @param {string[]} item_paths
 * @param {string[]} link_paths
 * @returns {string}
 */
function create_file_tree_string(item_paths, link_paths) {
  const all_paths = new Set([...item_paths, ...link_paths]);
  const tree = {};

  for (const path of all_paths) {
    let current = tree;
    const parts = path.split('/');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // final part is a file
        current[part] = null;
      } else {
        // an intermediate directory
        current[part] = current[part] || {};
      }
      current = current[part] || {};
    }
  }

  return build_tree_string(tree);
}

/**
 * build_tree_string
 * Recursively constructs a string representation of a nested tree object.
 *
 * @param {Object} node
 * @param {string} [prefix='']
 * @returns {string}
 */
function build_tree_string(node, prefix = '') {
  let result = '';
  const entries = Object.entries(node).sort((a, b) => {
    // directories first, then files
    const a_is_dir = a[1] !== null;
    const b_is_dir = b[1] !== null;
    if (a_is_dir && !b_is_dir) return -1;
    if (!a_is_dir && b_is_dir) return 1;
    return a[0].localeCompare(b[0]);
  });

  entries.forEach(([name, subnode], index) => {
    const is_last = index === entries.length - 1;
    const connector = is_last ? '└── ' : '├── ';

    if (subnode === null) {
      // file
      result += `${prefix}${connector}${name}\n`;
    } else {
      // directory
      result += `${prefix}${connector}${name}/\n`;
      result += build_tree_string(subnode, prefix + (is_last ? '    ' : '│   '));
    }
  });

  return result;
}

/**
 * replace_vars
 * Replaces placeholders of the form {{KEY}} with the corresponding value in replacements.
 *
 * @param {string} template
 * @param {Record<string, string|number>} replacements
 * @returns {string}
 */
function replace_vars(template, replacements) {
  let output = template;
  for (const [key, val] of Object.entries(replacements)) {
    const safe_val = (val !== undefined && val !== null) ? String(val) : '';
    output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safe_val);
  }
  return output;
}
