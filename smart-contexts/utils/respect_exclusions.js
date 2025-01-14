/**
 * @file respect_exclusions.js
 * @description
 * Removes lines/sections matching the excluded_headings patterns from each item’s content
 * before building the final context.
 */

import { parse_blocks } from 'smart-blocks/parsers/markdown.js';
import { match_glob } from 'smart-file-system/utils/match_glob.js';

/**
 * respect_exclusions(opts)
 * - For each item in `opts.items`, parses the content, finds headings, excludes them if matched.
 * - Also optionally processes `opts.links` if that’s required (rare).
 * - Mutates `opts.items{}` (and `opts.links{}` if needed).
 * 
 * @async
 * @param {Object} opts
 * @property {string[]} [opts.excluded_headings=[]] - patterns for headings to exclude
 * @property {Record<string,string>} [opts.items] - items to process
 * @property {Record<string,[string,string]>} [opts.links] - links to process
 * @returns {Promise<void>} modifies `opts.items` in-place
 */
export async function respect_exclusions(opts) {
  const excluded_list = (opts.excluded_headings || []).map(h => h.trim()).filter(Boolean);
  if (!excluded_list.length) return;

  // For each item in opts.items, parse the content, find headings, exclude matched ones.
  for (const [item_path, item_content] of Object.entries(opts.items || {})) {
    const [new_content, exclusions] = strip_excluded_headings(item_content, excluded_list);
    opts.items[item_path] = new_content;
    exclusions.forEach(h => {
      if(!opts.exclusions) opts.exclusions = {};
      if(!opts.exclusions[h]) opts.exclusions[h] = 0;
      opts.exclusions[h]++;
    });
  }

  // Optionally process links if they also contain headings. Usually links are short, but shown here if needed.
  for (const [link_key, link_obj] of Object.entries(opts.links || {})) {
    const {content} = link_obj;
    const [new_link_content, exclusions] = strip_excluded_headings(content, excluded_list);
    opts.links[link_key].content = new_link_content;
    exclusions.forEach(h => {
      if(!opts.exclusions) opts.exclusions = {};
      if(!opts.exclusions[h]) opts.exclusions[h] = 0;
      opts.exclusions[h]++;
    });
  }
  return opts;
}

/**
 * strip_excluded_headings
 * @param {string} content - The raw content
 * @param {string[]} excluded_list - The array of heading patterns to exclude
 * @returns {string} The content with matched headings and their sections removed
 */
function strip_excluded_headings(content, excluded_list) {
  const blocks_map = parse_blocks(content);
  if (!Object.keys(blocks_map).length) return [content, []];

  const exclusions = [];
  let lines = content.split('\n');
  let remove_line_ranges = [];

  // For each block, if heading matches an excluded pattern, we mark lines for removal
  for (const [block_key, line_range] of Object.entries(blocks_map)) {
    // block_key looks like "#Heading" or "#Top#Sub" etc. We only consider the final heading portion
    const splitted = block_key.split('#').filter(Boolean);
    if (!splitted.length) continue;
    const last_heading = splitted[splitted.length - 1];

    // Check if last_heading matches any excluded pattern
    for (const pattern of excluded_list) {
      if (match_glob(pattern, last_heading, { case_sensitive: false })) {
        remove_line_ranges.push({ start: line_range[0] - 1, end: line_range[1] - 1 });
        exclusions.push(pattern);
        break; // no need to check further patterns
      }
    }
  }

  if (!remove_line_ranges.length) return [content, []];

  // Merge intervals
  remove_line_ranges.sort((a, b) => a.start - b.start);
  let merged = [];
  let current = remove_line_ranges[0];
  for (let i = 1; i < remove_line_ranges.length; i++) {
    if (remove_line_ranges[i].start <= current.end + 1) {
      current.end = Math.max(current.end, remove_line_ranges[i].end);
    } else {
      merged.push(current);
      current = remove_line_ranges[i];
    }
  }
  merged.push(current);

  // Remove lines
  const new_lines = [];
  let prev_idx = 0;
  for (const interval of merged) {
    // push lines from prev_idx up to interval.start
    for (let i = prev_idx; i < interval.start; i++) {
      if (i < lines.length) new_lines.push(lines[i]);
    }
    prev_idx = interval.end + 1;
  }
  // push remainder
  for (let i = prev_idx; i < lines.length; i++) {
    new_lines.push(lines[i]);
  }

  return [new_lines.join('\n'), exclusions];
}
