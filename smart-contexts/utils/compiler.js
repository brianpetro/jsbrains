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
 *   - Directory lists are collapsed to avoid single-child chains.
 *   - The final ASCII tree output is generated via
 *     `build_file_tree_string(...)` from `smart-utils`.
*/

import { build_file_tree_string } from 'smart-utils/file_tree.js';
import { convert_to_time_ago } from 'smart-utils/convert_to_time_ago.js';

export async function compile_snapshot(context_snapshot, merged_opts) {
  const depths = Object.keys(context_snapshot.items)
    .map(d => parseInt(d, 10))
    .sort((a, b) => a - b);

  const chunks = [];

  // Build the per-depth chunk data
  for (const depth of depths) {
    const items = context_snapshot.items[depth] || {};
    const { before_raw, after_raw } = get_templates_for_depth(depth, merged_opts);

    for (const [path, item] of Object.entries(items)) {
      const placeholders = build_item_placeholders(path, depth, item.mtime);
      chunks.push({
        path,
        mtime: item.mtime,
        before_tpl: replace_vars(before_raw, placeholders),
        item_text: item.content,
        after_tpl: replace_vars(after_raw, placeholders)
      });
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
    const all_paths = chunks.map(c => c.path);
    // TODO add mtime for rendering FILE_TREE_MTIME var replacement
    file_tree_str = build_file_tree_string(all_paths);
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
    images: context_snapshot.images,
    pdfs: context_snapshot.pdfs,
  };
}


function get_templates_for_depth(depth, merged_opts) {
  let before_template_depth = depth;
  let before_raw = merged_opts.templates?.[before_template_depth]?.before;
  while (typeof before_raw !== 'string' && before_template_depth > -1) {
    before_template_depth--;
    before_raw = merged_opts.templates?.[before_template_depth]?.before;
  }
  let after_template_depth = depth;
  let after_raw = merged_opts.templates?.[after_template_depth]?.after;
  while (typeof after_raw !== 'string' && after_template_depth > -1) {
    after_template_depth--;
    after_raw = merged_opts.templates?.[after_template_depth]?.after;
  }
  return { before_raw, after_raw };
}

/**
 * Build placeholders for each chunk: {{ITEM_PATH}}, {{ITEM_NAME}}, {{ITEM_EXT}}, {{ITEM_DEPTH}}.
 * @param {string} path
 * @param {number} depth
 * @returns {object}
 */
function build_item_placeholders(path, depth, mtime) {
  const name = path.substring(path.lastIndexOf('/') + 1);
  const dot_pos = name.lastIndexOf('.');
  const ext = dot_pos > 0 ? name.slice(dot_pos + 1) : '';
  return {
    ITEM_PATH: path.replace("external:", ""),
    ITEM_NAME: name,
    ITEM_EXT: ext,
    ITEM_DEPTH: depth,
    ITEM_TIME_AGO: convert_to_time_ago(mtime)
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
