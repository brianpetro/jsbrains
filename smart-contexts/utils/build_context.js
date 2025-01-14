/**
 * @file build_context.js
 * @description Builds a final context string and stats object from an in-memory set of items and optional links.
 * No longer strips excluded sections here — that logic now belongs in `respect_exclusions.js`.
 */

/**
 * @typedef {Object} BuildResultStats
 * @property {number} item_count - Number of items processed
 * @property {number} link_count - Number of links processed
 * @property {number} char_count - Character count of the final 'context' string
 */

/**
 * @typedef {Object} BuildResult
 * @property {string} context - The final context string
 * @property {BuildResultStats} stats - Stats about merges, etc.
 */

/**
 * @typedef {Object} BuildContextOptions
 * @property {Record<string, string>} [items] - Main items (filename/path -> content)
 * @property {Record<string, [string, string]>} [links] - Item links:
 *   Format: {
 *     [sourceKey]: [linkedKey, linkContent]
 *   }
 * @property {string} [before_context] - Inserted at the beginning
 * @property {string} [after_context] - Inserted at the end
 * @property {string} [before_item] - Inserted before each item
 * @property {string} [after_item] - Inserted after each item
 * @property {string} [before_link] - Inserted before each link
 * @property {string} [after_link] - Inserted after each link
 * @property {boolean} [inlinks] - If true, link placeholders use "IN-LINK" as LINK_TYPE, else "OUT-LINK"
 */

/**
 * build_context()
 * Builds the final output from compiled items and optional links, applying
 * before/after placeholders around context, items, and links, and optionally injecting a file tree.
 * 
 * NOTE: Exclusion of headings is handled externally (via `respect_exclusions.js`).
 * This function assumes items/links have already been processed if any exclusions are needed.
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
    inlinks = false,
  } = opts;

  // Optionally build a naive file tree to inject if {{FILE_TREE}} is used
  const file_tree_string = create_file_tree_string(Object.keys(items), Object.keys(links));

  let content_accumulator = '';
  const stats = {
    item_count: 0,
    link_count: 0,
    char_count: 0,
  };

  const context_var_replacements = {
    FILE_TREE: file_tree_string,
  };
  // If there's a top-level prefix
  if (before_context) {
    content_accumulator += replace_vars(before_context, context_var_replacements) + '\n';
  }

  // Process items (primary)
  for (const [item_path, item_content] of Object.entries(items)) {
    stats.item_count++;

    // Insert <before_item>
    const item_var_replacements = {
      ITEM_PATH: item_path,
      ITEM_NAME: item_path.substring(item_path.lastIndexOf('/') + 1),
      ITEM_EXT: item_path.substring(item_path.lastIndexOf('.') + 1),
    };
    if (before_item) {
      content_accumulator += replace_vars(before_item, item_var_replacements) + '\n';
    }

    // Append the item content (no heading-exclusion here)
    content_accumulator += item_content.trim() + '\n';

    // Insert <after_item>
    if (after_item) {
      content_accumulator += replace_vars(after_item, item_var_replacements) + '\n';
    }
  }

  // Process links (secondary)
  for (const [link_key, linkData] of Object.entries(links)) {
    if (!linkData) continue;
    stats.link_count++;

    const {to, from, content, type, depth} = linkData;

    let item_key;
    if(to?.[0]) item_key = to[0];
    else if(from?.[0]) item_key = from[0];

    const link_var_replacements = {
      LINK_PATH: link_key,
      LINK_NAME: link_key.substring(link_key.lastIndexOf('/') + 1),
      LINK_TYPE: type?.[0],
      LINK_DEPTH: depth?.[0],
      LINK_EXT: link_key.substring(link_key.lastIndexOf('.') + 1),
      LINK_ITEM_PATH: item_key,
      LINK_ITEM_NAME: item_key.substring(item_key.lastIndexOf('/') + 1),
      LINK_ITEM_EXT: item_key.substring(item_key.lastIndexOf('.') + 1),
    };
    // Insert <before_link>
    if (before_link) {
      content_accumulator += replace_vars(before_link, link_var_replacements) + '\n';
    }

    // Append link content
    content_accumulator += content.trim() + '\n';

    // Insert <after_link>
    if (after_link) {
      content_accumulator += replace_vars(after_link, link_var_replacements) + '\n';
    }
  }

  // If there's a bottom-level suffix
  if (after_context) {
    content_accumulator += replace_vars(after_context, context_var_replacements) + '\n';
  }

  const final_str = content_accumulator.trim();
  stats.char_count = final_str.length;

  return {
    context: final_str,
    stats,
  };
}

/**
 * Creates a tree representation of files matching the format in main.js
 * @param {string[]} itemPaths
 * @param {string[]} linkPaths
 * @returns {string}
 */
function create_file_tree_string(itemPaths, linkPaths) {
  const allPaths = new Set([...itemPaths, ...linkPaths]);
  const tree = {};

  // Build tree structure
  for (const path of allPaths) {
    let current = tree;
    const parts = path.split('/');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // It's a file
        current[part] = null;
      } else {
        // It's a directory
        current[part] = current[part] || {};
      }
      current = current[part] || {};
    }
  }

  // Generate tree string
  function buildTreeString(node, prefix = '') {
    let result = '';
    const entries = Object.entries(node).sort((a, b) => {
      // Directories come before files
      const aIsDir = a[1] !== null;
      const bIsDir = b[1] !== null;
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a[0].localeCompare(b[0]);
    });

    entries.forEach(([name, subNode], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      
      if (subNode === null) {
        // File
        result += `${prefix}${connector}${name}\n`;
      } else {
        // Directory
        result += `${prefix}${connector}${name}/\n`;
        result += buildTreeString(subNode, prefix + (isLast ? '    ' : '│   '));
      }
    });
    
    return result;
  }

  return buildTreeString(tree);
}

/**
 * Replaces link placeholders in a template:
 * - {{LINK_PATH}}, {{LINK_NAME}}, {{LINK_ITEM_PATH}}, {{LINK_ITEM_NAME}}, {{LINK_TYPE}}
 * @param {string} template
 * @param {Object} linkObj
 * @returns {string}
 */
function replace_vars(template, linkObj) {
  let replaced = template;
  for(const [key, value] of Object.entries(linkObj)){
    replaced = replaced.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return replaced;
}
