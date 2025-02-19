/**
 * @file respect_exclusions.js
 * @description
 * Removes lines/sections matching the excluded_headings patterns from each item’s content.
 * Exclusion logic operates by finding headings in markdown and removing that heading + subsequent lines
 * until the next heading.
 */

import { parse_blocks } from 'smart-blocks/parsers/markdown.js';
import { match_glob } from 'smart-file-system/utils/match_glob.js';

/**
 * respect_exclusions(context_snapshot={}, opts={})
 * @param {Object} context_snapshot
 * @param {Object} opts
 * @property {string[]} [opts.excluded_headings=[]]
 */
export async function respect_exclusions(context_snapshot = {}, opts = {}) {
  const excluded_list = (opts.excluded_headings || []).map(h => h.trim()).filter(Boolean);
  if (!excluded_list.length) return;
  for(const [depth, context_items] of Object.entries(context_snapshot.items || {})) {
    for (const [item_key, item_content] of Object.entries(context_items || {})) {
      const [new_content, exclusions, removed_char_count] = strip_excluded_headings(item_content, excluded_list);
      context_snapshot.char_count -= removed_char_count;
      context_snapshot.items[depth][item_key] = new_content;
      if (exclusions.length) {
        if(!context_snapshot.exclusions) context_snapshot.exclusions = {};
        for (const h of exclusions) {
          if(!context_snapshot.exclusions[h]) context_snapshot.exclusions[h] = 0;
          context_snapshot.exclusions[h]++;
        }
      }
    }
  }
}

function strip_excluded_headings(content, excluded_list) {
  const blocks_map = parse_blocks(content, { start_index: 0 });
  if (!Object.keys(blocks_map).length) return [content, []];

  const exclusions = [];
  let lines = content.split('\n');

  for (const [block_key, line_range] of Object.entries(blocks_map)) {
    // block_key might be "stuff.md# Secret" or just "# Secret" etc. if your parser includes the filename
    const splitted = block_key.split('#').filter(Boolean);
    if (!splitted.length) continue;
    // *** Trim the heading to handle leading spaces ***
    const last_heading = splitted[splitted.length - 1].trim();

    for (const pattern of excluded_list) {
      if (match_glob(pattern, last_heading, { case_sensitive: false })) {
        for(let i = line_range[0]; i <= line_range[1]; i++) {
          lines[i] = null;
        }
        exclusions.push(pattern);
        break;
      }
    }
  }

  lines = lines.filter(Boolean);
  const new_content = lines.join('\n');
  const removed_char_count = content.length - new_content.length;
  return [new_content, exclusions, removed_char_count];
}
