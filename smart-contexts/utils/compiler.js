/**
 * @file compiler.js
 * @description
 * Compiles a snapshot of items (grouped by depth) into a final string with templates:
 *   - For each item, we have before-tpl + item-text + after-tpl
 *   - If the templates themselves exceed max_len, skip the item entirely.
 *   - Otherwise truncate only item-text as needed to fit into max_len.
 *   - Concatenate all items.
 *   - Finally, optionally apply top-level wrap (templates[-1]) if it still fits; skip otherwise.
 *
 * Enhanced File Tree Logic:
 *   - We still build a nested structure from all file paths.
 *   - After building, we call `compress_single_child_dirs(...)` to collapse
 *     directories with only one child. For example:
 *       docs/
 *         subdir/
 *           single.md
 *     becomes:
 *       docs/subdir/
 *         single.md
 *
 *   - The final ASCII tree output is then created via `build_tree_string(...)`.
 */

export async function compile_snapshot(context_snapshot, merged_opts) {
  const depths = Object.keys(context_snapshot.items)
    .map(d => parseInt(d, 10))
    .sort((a, b) => a - b);

  const all_paths = [];
  const chunks = [];

  // Build the per-depth chunk data
  for (const depth of depths) {
    const items = context_snapshot.items[depth] || {};
    const before_raw = merged_opts.templates?.[depth]?.before || '';
    const after_raw  = merged_opts.templates?.[depth]?.after  || '';

    for (const [path, item] of Object.entries(items)) {
      const placeholders = build_item_placeholders(path, depth);
      chunks.push({
        path,
        before_tpl: replace_vars(before_raw, placeholders),
        item_text: item.content,
        after_tpl: replace_vars(after_raw, placeholders)
      });
      all_paths.push(path);
    }
  }

  const skipped_items = new Set(context_snapshot.skipped_items || []);
  const truncated_items = new Set(context_snapshot.truncated_items || []);
  const max_len = merged_opts.max_len || 0;

  // Build up each chunk
  const result_pieces = [];
  for (const chunk of chunks) {
    if (!max_len) {
      // No limit => everything
      const joined = [chunk.before_tpl, chunk.item_text, chunk.after_tpl].join('\n');
      result_pieces.push(joined);
      continue;
    }

    // Check templates alone
    const template_len = chunk.before_tpl.length + chunk.after_tpl.length;
    const leftover_for_text = max_len - template_len;
    const text_len = chunk.item_text.length;

    if (text_len <= leftover_for_text) {
      // No truncation needed
      const joined = [chunk.before_tpl, chunk.item_text, chunk.after_tpl].join('\n');
      result_pieces.push(joined);
    } else {
      // Partial truncation
      truncated_items.add(chunk.path);
      const partial = chunk.item_text.slice(0, leftover_for_text);
      const joined = [chunk.before_tpl, partial, chunk.after_tpl].join('\n');
      result_pieces.push(joined);
    }
  }

  // Concatenate chunks
  let raw_output = result_pieces.join('\n');

  // Top-level wrap
  const top_before_raw = merged_opts.templates?.['-1']?.before || '';
  const top_after_raw  = merged_opts.templates?.['-1']?.after  || '';

  // Check if we must inject a file tree
  const want_tree =
    top_before_raw.includes('{{FILE_TREE}}') ||
    top_after_raw.includes('{{FILE_TREE}}');
  let file_tree_str = '';
  if (want_tree) {
    file_tree_str = create_file_tree_string(all_paths);
  }

  const wrap_before = replace_vars(top_before_raw, { FILE_TREE: file_tree_str });
  const wrap_after  = replace_vars(top_after_raw,  { FILE_TREE: file_tree_str });

  let final_context = '';
  const wrap_has_content = (wrap_before.length > 0 || wrap_after.length > 0);

  if (!wrap_has_content) {
    // No top-level template => final is just raw_output + newline
    final_context = raw_output + '\n';
  } else {
    // We do have top-level wrap text
    final_context = wrap_before + '\n' + raw_output + '\n' + wrap_after + '\n';
  }

  const final_len = final_context.length;

  // Return trimmed context, with stats
  const stats = {
    char_count: final_len,
    depth_count: depths.length,
    truncated_items: Array.from(truncated_items),
    skipped_items:  Array.from(skipped_items),
  };

  return {
    context: final_context.trim(),
    stats,
    images: context_snapshot.images
  };
}


/**
 * Build placeholders for each chunk: {{ITEM_PATH}}, {{ITEM_NAME}}, {{ITEM_EXT}}, {{ITEM_DEPTH}}.
 * @param {string} path
 * @param {number} depth
 * @returns {object}
 */
function build_item_placeholders(path, depth) {
  const name = path.substring(path.lastIndexOf('/') + 1);
  const dot_pos = name.lastIndexOf('.');
  const ext = dot_pos > 0 ? name.slice(dot_pos + 1) : '';
  return {
    ITEM_PATH: path,
    ITEM_NAME: name,
    ITEM_EXT: ext,
    ITEM_DEPTH: depth
  };
}


/**
 * Replaces {{KEY}} in a string with the provided replacements object.
 * @param {string} template
 * @param {object} replacements
 * @returns {string}
 */
function replace_vars(template, replacements) {
  if (!template) return '';
  let out = template;
  for (const [k, v] of Object.entries(replacements)) {
    const safe_v = (v !== undefined && v !== null) ? String(v) : '';
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), safe_v);
  }
  return out;
}


/**
 * Creates a directory/file tree string for {{FILE_TREE}} placeholders.
 * Incorporates single-child directory compression for cleaner output.
 * @param {string[]} all_paths
 * @returns {string}
 */
function create_file_tree_string(all_paths) {
  // Build a nested object structure
  const root = {};
  for (const p of all_paths) {
    let cursor = root;
    const parts = p.split('/');
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        // Final part => file
        cursor[part] = null;
      } else {
        // Directory
        if (!cursor[part]) cursor[part] = {};
        cursor = cursor[part];
      }
    }
  }

  // Compress any single-child directory chains
  compress_single_child_dirs(root);

  // Then convert to ASCII tree
  return build_tree_string(root);
}


/**
 * Recursively compress single-child directories within the tree.
 * @param {object} node - The current portion of the tree (key -> subnode).
 */
function compress_single_child_dirs(node) {
  if (!node || typeof node !== 'object') return;

  const keys = Object.keys(node);
  for (const k of keys) {
    const child = node[k];
    if (child && typeof child === 'object') {
      // Count children of `child`
      const childKeys = Object.keys(child);
      if (childKeys.length === 1) {
        // Only one subnode => compress
        const subKey = childKeys[0];
        const subChild = child[subKey];
        // Form new combined name if subKey is a directory
        // If subChild !== null => it's a directory
        if (subChild !== null) {
          // Combine "k" + "/" + subKey
          const combined = k + '/' + subKey;
          // Move that subChild up
          node[combined] = subChild;
          delete node[k];
          // Recurse deeper on the newly created node
          compress_single_child_dirs(node[combined]);
        } else {
          // subChild === null means child is a single file
          // => do not combine
          // but we can still rename "k + '/' + subKey" if we want a slash
          // Typically though, that suggests a "folder" containing one file
          // We'll skip that to keep file name on a separate leaf.
        }
      } else {
        // Recurse on the child as is
        compress_single_child_dirs(child);
      }
    }
  }
}


/**
 * Recursively builds an ASCII tree from a node object,
 * sorting directories first, then files, in alphabetical order.
 * @param {object|null} node
 * @param {string} prefix
 * @returns {string}
 */
function build_tree_string(node, prefix = '') {
  let res = '';
  const entries = Object.entries(node).sort((a, b) => {
    const a_is_dir = a[1] !== null;
    const b_is_dir = b[1] !== null;
    if (a_is_dir && !b_is_dir) return -1;
    if (!a_is_dir && b_is_dir) return 1;
    return a[0].localeCompare(b[0]);
  });

  entries.forEach(([name, subnode], idx) => {
    const is_last = (idx === entries.length - 1);
    const connector = is_last ? '└── ' : '├── ';

    if (subnode === null) {
      // File
      res += prefix + connector + name + '\n';
    } else {
      // Directory
      res += prefix + connector + name + '/\n';
      const next_prefix = prefix + (is_last ? '    ' : '│   ');
      res += build_tree_string(subnode, next_prefix);
    }
  });
  return res;
}
