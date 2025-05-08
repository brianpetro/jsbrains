/**
 * @file respect_exclusions.js
 * @description
 * Removes lines/sections matching the excluded_headings patterns from each item’s content.
 * This updated version correctly handles multiple occurrences of the *same* heading name inside
 * a single file. Because `parse_markdown_blocks` appends de‑duplication tokens such as
 * "[2]" or "#{3}" to repeated headings, we normalise each heading before matching so that
 * the pattern "Secret" will match "Secret", "Secret[2]", and "Secret#{3}" alike.
 */

import { parse_markdown_blocks } from 'smart-blocks/parsers/markdown.js';
import { match_glob } from 'smart-file-system/utils/match_glob.js';

/**
 * Normalises a heading extracted from `parse_markdown_blocks` by stripping any numeric
 * suffixes that the parser adds to make duplicate headings unique.
 *
 * Examples:
 *   "Secret[2]"  -> "Secret"
 *   "Secret#{3}" -> "Secret"
 *
 * @param {string} heading
 * @returns {string}
 */
function normalise_heading(heading) {
  return heading
    // Remove trailing "[number]" tokens added for top‑level duplicates
    .replace(/\[\d+\]$/, '')
    // Remove trailing "#{number}" tokens added for sub‑heading duplicates
    .replace(/#\{\d+\}$/, '')
    .trim();
}

/**
 * respect_exclusions(context_snapshot={}, opts={})
 * Mutates the provided snapshot in‑place, stripping excluded headings from each item’s content.
 * Char counts are updated accordingly and a global `exclusions` tally is maintained.
 *
 * @param {Object} context_snapshot
 * @param {Object} opts
 * @property {string[]} [opts.excluded_headings=[]]
 */
export async function respect_exclusions(context_snapshot = {}, opts = {}) {
  const excluded_list = (opts.excluded_headings || []).map(h => h.trim()).filter(Boolean);
  if (!excluded_list.length) return;

  for (const [depth, context_items] of Object.entries(context_snapshot.items || {})) {
    for (const [item_key, item_obj] of Object.entries(context_items || {})) {
      const [new_content, exclusions, removed_char_count] = strip_excluded_headings(
        item_obj.content,
        excluded_list
      );

      context_snapshot.char_count -= removed_char_count;
      context_snapshot.items[depth][item_key].content = new_content;

      if (exclusions.length) {
        if (!context_snapshot.exclusions) context_snapshot.exclusions = {};
        for (const h of exclusions) {
          if (!context_snapshot.exclusions[h]) context_snapshot.exclusions[h] = 0;
          context_snapshot.exclusions[h] += 1;
        }
      }
    }
  }
}


/**
 * Strip headings and their blocks that match any of the provided patterns.
 *
 * @param {string} content   The raw markdown of a single file
 * @param {string[]} excluded_list  Array of glob patterns (case‑insensitive)
 * @returns {[string, string[], number]}  [new_content, exclusions, removed_char_count]
 */
export function strip_excluded_headings(content, excluded_list) {
  const blocks_map = parse_markdown_blocks(content, { start_index: 0 });
  if (!Object.keys(blocks_map).length) return [content, [], 0];

  const exclusions = [];
  let lines = content.split('\n');

  for (const [block_key, line_range] of Object.entries(blocks_map)) {
    const parts = block_key.split('#').filter(Boolean);
    if (!parts.length) continue;

    // The last part is the actual heading title, possibly with de‑duplication suffixes.
    const raw_heading = parts[parts.length - 1].trim();
    const heading = normalise_heading(raw_heading);

    for (const pattern of excluded_list) {
      if (match_glob(pattern, heading, { case_sensitive: false })) {
        // Null‑out the lines belonging to this heading block.
        for (let i = line_range[0]; i <= line_range[1]; i++) {
          lines[i] = null;
        }
        exclusions.push(pattern);
        break; // No need to test other patterns once matched
      }
    }
  }

  lines = lines.filter(Boolean);
  const new_content = lines.join('\n');
  const removed_char_count = content.length - new_content.length;
  return [new_content, exclusions, removed_char_count];
}