/*******************************************************
 * @file snapshot.js
 * @description
 * Builds a context_snapshot from a SmartContext instance:
 *   1) Depth=0 items come from context_items{} in the SmartContext.
 *      - Expand any folder references into files, sort by ascending file size.
 *      - Parse ```smart-context code blocks to gather additional paths at the same depth.
 *      - Respect ignore patterns (.gitignore, .scignore) to skip unwanted files/folders.
 *      - Enforce max_len if set:
 *          - The first item that exceeds leftover space is partially truncated;
 *          - Subsequent oversized items are skipped entirely.
 *   2) For each depth=1..link_depth:
 *      - Collect outlinks (and inlinks if inlinks=true) from items at the previous depth.
 *      - Expand them (folder → files, codeblocks, ignoring duplicates).
 *      - Sort by ascending size, apply partial truncation or skip logic for max_len.
 *   3) Respect heading-based exclusions from merged_opts.excluded_headings by removing
 *      matching sections from the final snapshot items (via respect_exclusions).
 *   4) Return the final snapshot:
 *      {
 *        items: {
 *          0: { path: "content", ... },
 *          1: { path: "content", ... },
 *          ...
 *        },
 *        truncated_items: [],
 *        skipped_items: [],
 *        missing_items: [],
 *        char_count: Number (total content length after truncation/exclusions),
 *        exclusions: { headingPattern: count, ... } (optional, if any were removed)
 *      }
 *******************************************************/

import fs from 'fs';
import path from 'path';
import { respect_exclusions } from './respect_exclusions.js';
import { load_ignore_patterns_smart, should_ignore } from 'smart-file-system/utils/ignore.js';

/**
 * build_snapshot
 * Main orchestration for building a context snapshot from a SmartContext item.
 *
 * @async
 * @param {SmartContext} ctx_item - The SmartContext instance
 * @param {Object} merged_opts - Merged user + item + collection options
 * @property {number} [merged_opts.link_depth=0] - Depth of link traversal
 * @property {boolean} [merged_opts.inlinks=false] - Whether to include inbound links
 * @property {string[]} [merged_opts.excluded_headings=[]] - Patterns to remove heading sections
 * @property {number} [merged_opts.max_len=0] - If > 0, limit total snapshot content length
 * @returns {Promise<object>} context_snapshot
 */
export async function build_snapshot(ctx_item, merged_opts) {
  // 1) Load ignore patterns from .gitignore/.scignore if available
  const ignore_patterns = await load_ignore_patterns_smart(
    ctx_item.env?.smart_fs,
    '',
    true
  );

  // 2) Create the initial empty snapshot
  const initial_snapshot = create_empty_snapshot();

  // 3) Gather depth=0 items
  let snapshot = await gather_depth_zero_items(
    ctx_item,
    merged_opts,
    initial_snapshot,
    ignore_patterns
  );

  // 4) Traverse link depths (1..N), if requested
  snapshot = await gather_link_depth_items(ctx_item, merged_opts, snapshot, ignore_patterns);

  // 5) Remove empty depth=0 if no items were inserted
  snapshot = remove_empty_depth_zero(snapshot);

  // 6) Apply heading/section exclusions from merged_opts.excluded_headings
  snapshot = await apply_exclusions(snapshot, merged_opts);

  return snapshot;
}

/**
 * create_empty_snapshot
 * Produces the initial snapshot object with default arrays/values.
 *
 * @returns {object}
 */
function create_empty_snapshot() {
  return {
    items: {},
    truncated_items: [],
    skipped_items: [],
    missing_items: [],
    char_count: 0
  };
}

/**
 * gather_depth_zero_items
 * Expands the SmartContext.data.context_items at depth=0.
 *   - Folders are expanded to files.
 *   - Each file is read and scanned for ```smart-context references.
 *   - Sort by ascending file size, then insert them at depth=0 respecting partial truncation.
 *
 * @async
 * @param {SmartContext} ctx_item
 * @param {Object} merged_opts
 * @param {Object} snapshot
 * @param {string[]} ignore_patterns
 * @returns {Promise<object>} Updated snapshot
 */
async function gather_depth_zero_items(ctx_item, merged_opts, snapshot, ignore_patterns) {
  const context_items = ctx_item.data?.context_items || {};

  // Expand each item (folder → all files, single file → itself)
  const expansions = [];
  for (const [path_or_key, flag] of Object.entries(context_items)) {
    if (!flag) continue; // skip false/undefined
    const expanded = await expand_path_or_folder(ctx_item, path_or_key, false, ignore_patterns);
    expansions.push(...expanded);
  }

  // Retrieve content, codeblock expansions, measure length
  const items_with_lengths = await gather_items_with_lengths(
    expansions,
    ctx_item,
    merged_opts,
    snapshot,
    ignore_patterns
  );
  // Sort by ascending size
  items_with_lengths.sort((a, b) => a.length - b.length);

  // Insert them at depth=0 with partial truncation logic
  const updated_snapshot = insert_items_at_depth(
    snapshot,
    items_with_lengths,
    0,
    merged_opts
  );

  return updated_snapshot;
}

/**
 * gather_link_depth_items
 * Repeats expansions for link_depth≥1, collecting outlinks (and inlinks if inlinks=true)
 * from the previous depth.
 *
 * @async
 * @param {SmartContext} ctx_item
 * @param {Object} merged_opts
 * @param {Object} snapshot
 * @param {string[]} ignore_patterns
 * @returns {Promise<object>} Updated snapshot
 */
async function gather_link_depth_items(ctx_item, merged_opts, snapshot, ignore_patterns) {
  const max_depth = merged_opts.link_depth || 0;
  if (max_depth <= 0) {
    return snapshot;
  }

  let updated_snapshot = snapshot;

  for (let depth = 1; depth <= max_depth; depth++) {
    const prev_depth_obj = updated_snapshot.items[depth - 1] || {};
    const prev_keys = Object.keys(prev_depth_obj);
    if (!prev_keys.length) {
      break; // no items in the previous depth => no further links
    }

    // Collect link candidates from outlinks/inlinks
    const link_candidates = await collect_depth_candidates(
      ctx_item,
      merged_opts,
      prev_keys,
      updated_snapshot
    );
    if (!link_candidates.length) {
      break;
    }

    // Expand those candidate paths (folders → files, codeblocks, ignoring duplicates)
    const expansions = [];
    for (const link_key of link_candidates) {
      const sub_expanded = await expand_path_or_folder(
        ctx_item,
        link_key,
        false,
        ignore_patterns
      );
      expansions.push(...sub_expanded);
    }

    // gather items with content + length
    const items_with_lengths = await gather_items_with_lengths(
      expansions,
      ctx_item,
      merged_opts,
      updated_snapshot,
      ignore_patterns
    );
    items_with_lengths.sort((a, b) => a.length - b.length);

    // Insert them at snapshot.items[depth]
    updated_snapshot = insert_items_at_depth(
      updated_snapshot,
      items_with_lengths,
      depth,
      merged_opts
    );

    // If that depth ended up empty, remove it
    if (!updated_snapshot.items[depth] || !Object.keys(updated_snapshot.items[depth]).length) {
      const { [depth]: _, ...rest } = updated_snapshot.items;
      updated_snapshot.items = rest;
    }
  }

  return updated_snapshot;
}

/**
 * collect_depth_candidates
 * Gathers outlinks (and inlinks if inlinks=true) from the given set of item paths.
 * Filters out any link_keys already in the snapshot.
 *
 * @async
 * @param {SmartContext} ctx_item
 * @param {Object} merged_opts
 * @param {string[]} prev_depth_keys
 * @param {Object} snapshot
 * @returns {Promise<string[]>} Unique link keys not yet in snapshot
 */
async function collect_depth_candidates(ctx_item, merged_opts, prev_depth_keys, snapshot) {
  const candidates = [];
  for (const pkey of prev_depth_keys) {
    const ref = await ctx_item.get_ref(pkey);
    if (!ref) continue;
    const outlinks = Array.isArray(ref.outlinks) ? ref.outlinks : [];
    const inlinks = merged_opts.inlinks ? (Array.isArray(ref.inlinks) ? ref.inlinks : []) : [];
    const combined = outlinks.concat(inlinks);

    for (const link_key of combined) {
      if (!already_in_snapshot(link_key, snapshot)) {
        candidates.push(link_key);
      }
    }
  }
  return candidates;
}

/**
 * remove_empty_depth_zero
 * If depth=0 has no items, remove it from the snapshot.
 *
 * @param {Object} snapshot
 * @returns {Object} Possibly updated snapshot
 */
function remove_empty_depth_zero(snapshot) {
  const depth0 = snapshot.items[0];
  if (!depth0 || !Object.keys(depth0).length) {
    const { 0: _, ...rest } = snapshot.items;
    return { ...snapshot, items: rest };
  }
  return snapshot;
}

/**
 * apply_exclusions
 * Invokes respect_exclusions to remove heading-based sections from snapshot items.
 *
 * @async
 * @param {Object} snapshot
 * @param {Object} merged_opts
 * @property {string[]} [merged_opts.excluded_headings=[]]
 * @returns {Promise<object>} Updated snapshot with excluded headings removed
 */
async function apply_exclusions(snapshot, merged_opts) {
  const excluded_list = merged_opts.excluded_headings || [];
  if (!excluded_list.length) {
    return snapshot;
  }

  // We'll clone to pass into respect_exclusions, which mutates the given object
  const cloned = JSON.parse(JSON.stringify(snapshot));
  await respect_exclusions(cloned, { excluded_headings: excluded_list });
  return cloned;
}

/**
 * expand_path_or_folder
 * Given a path_key that may be a folder or file, expand it:
 *  - If it's a folder, list files recursively.
 *  - If it's a file, return it directly.
 *  - Filter out any that match ignore_patterns.
 *
 * @async
 * @param {SmartContext} ctx_item
 * @param {string} path_or_key
 * @param {boolean} external - If true, use Node fallback only
 * @param {string[]} ignore_patterns
 * @returns {Promise<Array<{ path: string }>>}
 */
async function expand_path_or_folder(ctx_item, path_or_key, external, ignore_patterns) {
  // 1) Attempt environment FS if not external
  if (!external) {
    const expansions_env = await try_expand_with_fs(ctx_item, path_or_key, false, ignore_patterns);
    if (expansions_env) return expansions_env;
  }
  // 2) Fallback to Node fs
  const expansions_node = await try_expand_with_fs(ctx_item, path_or_key, true, ignore_patterns);
  return expansions_node || [];
}

/**
 * try_expand_with_fs
 * Check if the path is a directory or file, using either the environment's FS or Node fs.
 * Return an array of expansions: { path: <string> }
 *
 * @async
 * @param {SmartContext} ctx_item
 * @param {string} path_or_key
 * @param {boolean} use_node_fs
 * @param {string[]} ignore_patterns
 * @returns {Promise<Array<{ path: string }> | null>}
 */
async function try_expand_with_fs(ctx_item, path_or_key, use_node_fs, ignore_patterns) {
  const system_fs = use_node_fs ? create_node_fs_shim() : get_environment_fs(ctx_item);
  if (!system_fs) return null;

  const stat_obj = await system_fs.stat(path_or_key);
  if (!stat_obj) return null;

  if (stat_obj.isDirectory()) {
    // expand directory
    const files = await system_fs.list_files_recursive(path_or_key);
    // filter out ignored
    const valid = files.filter(f => !should_ignore(f.path, ignore_patterns));
    return valid.map(f => ({ path: f.path }));
  }
  // Single file
  if (should_ignore(path_or_key, ignore_patterns)) {
    return [];
  }
  return [{ path: path_or_key }];
}

/**
 * get_environment_fs
 * Return the environment's smart_fs if it exposes stat / list_files_recursive, else null.
 *
 * @param {SmartContext} ctx_item
 * @returns {Object|null}
 */
function get_environment_fs(ctx_item) {
  const env_fs = ctx_item?.env?.smart_fs;
  if (!env_fs) return null;
  if (typeof env_fs.stat !== 'function' || typeof env_fs.list_files_recursive !== 'function') {
    return null;
  }
  return env_fs;
}

/**
 * create_node_fs_shim
 * Provide an object implementing stat() and list_files_recursive() using Node's built-in fs.
 *
 * @returns {Object}
 */
function create_node_fs_shim() {
  return {
    async stat(p) {
      try {
        const st = fs.statSync(p);
        return {
          isDirectory: () => st.isDirectory(),
          isFile: () => st.isFile()
        };
      } catch {
        return null;
      }
    },
    async list_files_recursive(dir_path) {
      try {
        return get_recursive_node_files(dir_path);
      } catch {
        return [];
      }
    },
    sep: '/'
  };
}

/**
 * get_recursive_node_files
 * Recursively gather all file paths under a directory using Node fs.
 *
 * @param {string} dir_path
 * @returns {Array<{ path: string }>}
 */
function get_recursive_node_files(dir_path) {
  const results = [];
  const listing = fs.readdirSync(dir_path, { withFileTypes: true });
  for (const entry of listing) {
    const full_path = path.join(dir_path, entry.name);
    if (entry.isDirectory()) {
      results.push(...get_recursive_node_files(full_path));
    } else {
      results.push({ path: full_path });
    }
  }
  return results;
}

/**
 * gather_items_with_lengths
 * For each expansion => read content, parse ```smart-context code blocks,
 * gather newly referenced paths, measure length, and return array of { path, content_str, length }.
 * Skips items that cannot be read, adding them to snapshot.missing_items.
 *
 * @async
 * @param {Array<{ path:string }>} expansions
 * @param {SmartContext} ctx_item
 * @param {Object} merged_opts
 * @param {Object} snapshot
 * @param {string[]} ignore_patterns
 * @returns {Promise<Array<{ path:string, content_str:string, length:number }>>}
 */
async function gather_items_with_lengths(expansions, ctx_item, merged_opts, snapshot, ignore_patterns) {
  const results = [];

  for (let i = 0; i < expansions.length; i++) {
    const candidate = expansions[i];
    const content = await read_content_for(ctx_item, candidate.path);
    if (content === false) {
      // track missing
      snapshot.missing_items.push(candidate.path);
      continue;
    }
    if (typeof content !== 'string') {
      // skip weird content
      continue;
    }

    // parse codeblock lines for references
    const base_path = ctx_item.env?.smart_fs?.base_path || '';
    const codeblock_refs = parse_smart_context_codeblock_lines(content, base_path);
    for (const ref_obj of codeblock_refs) {
      // expand only if not in expansions or results or snapshot
      const found_expansion = expansions.some(e => e.path === ref_obj.path);
      const found_result = results.some(r => r.path === ref_obj.path);
      const found_snapshot = already_in_snapshot(ref_obj.path, snapshot);

      if (!found_expansion && !found_result && !found_snapshot) {
        // expand codeblock reference
        const sub_expanded = await expand_path_or_folder(
          ctx_item,
          ref_obj.path,
          ref_obj.external,
          ignore_patterns
        );
        expansions.push(...sub_expanded);
      }
    }

    // add the item to results
    results.push({
      path: candidate.path,
      content_str: content,
      length: content.length
    });
  }

  return results;
}

/**
 * read_content_for
 * 1) If there's a recognized item with .read() method, use it
 * 2) Else environment FS read
 * 3) Else Node fs read
 *
 * @async
 * @param {SmartContext} ctx_item
 * @param {string} the_path
 * @returns {Promise<string|false>}
 */
async function read_content_for(ctx_item, the_path) {
  // 1) recognized item (like a SmartSource) with .read()
  if (typeof ctx_item.get_ref === 'function') {
    const maybe_ref = ctx_item.get_ref(the_path);
    if (maybe_ref && typeof maybe_ref.read === 'function') {
      const out = await maybe_ref.read();
      return out || '';
    }
  }

  // 2) environment FS
  const env_fs = get_environment_fs(ctx_item);
  if (env_fs && typeof env_fs.read === 'function') {
    try {
      if (await env_fs.exists(the_path)) {
        const data = await env_fs.read(the_path);
        return data || '';
      }
    } catch {
      // ignore
    }
  }

  // 3) fallback to Node fs
  try {
    if (fs.existsSync(the_path)) {
      return fs.readFileSync(the_path, 'utf8') || '';
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * parse_smart_context_codeblock_lines
 * Scans the content for ```smart-context code blocks and returns each non-empty line as a path reference.
 * If a line starts with '../', treat it as external referencing an absolute path join.
 *
 * @param {string} content
 * @param {string} root_path
 * @returns {Array<{ path:string, external:boolean }>}
 */
export function parse_smart_context_codeblock_lines(content, root_path) {
  const lines = content.split('\n');
  let inside_block = false;
  const results = [];

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('```smart-context')) {
      inside_block = true;
      continue;
    }
    if (inside_block && trimmed.startsWith('```')) {
      inside_block = false;
      continue;
    }
    if (inside_block) {
      if (!trimmed) continue;
      if (trimmed.startsWith('../')) {
        // external path
        const absolute_path = path.join(root_path, trimmed);
        results.push({ path: absolute_path, external: true });
      } else {
        results.push({ path: trimmed, external: false });
      }
    }
  }
  return results;
}

/**
 * already_in_snapshot
 * Checks if link_key is present at any depth in snapshot.items.
 *
 * @param {string} link_key
 * @param {object} snapshot
 * @returns {boolean}
 */
export function already_in_snapshot(link_key, snapshot) {
  return Object.values(snapshot.items).some(depth_obj => link_key in depth_obj);
}

/**
 * insert_items_at_depth
 * Takes an array of {path, content_str, length} and inserts them into snapshot.items[depth].
 * Respects merged_opts.max_len so that:
 *   - The first item that doesn't fit is partially truncated,
 *   - All subsequent items that don't fit are fully skipped.
 *
 * @param {Object} snapshot
 * @param {Array} items_with_lengths
 * @param {number} depth
 * @param {Object} merged_opts
 * @returns {Object} Updated snapshot
 */
function insert_items_at_depth(snapshot, items_with_lengths, depth, merged_opts) {
  const new_snapshot = clone_snapshot_shallow(snapshot);
  if (!new_snapshot.items[depth]) {
    new_snapshot.items[depth] = {};
  }

  const max_len = merged_opts.max_len || 0;
  let has_added_any_item = snapshot_has_any_items(new_snapshot);

  for (const item of items_with_lengths) {
    if (reached_limit(new_snapshot.char_count, max_len)) {
      new_snapshot.skipped_items.push(item.path);
      continue;
    }

    const leftover = leftover_chars(new_snapshot.char_count, max_len);
    let content = item.content_str;

    if (max_len > 0) {
      if (!has_added_any_item) {
        // The first item that doesn't fully fit => partial truncation
        if (content.length > leftover) {
          content = content.slice(0, leftover);
          new_snapshot.truncated_items.push(item.path);
        }
        new_snapshot.items[depth][item.path] = content;
        new_snapshot.char_count += content.length;
        has_added_any_item = true;
      } else {
        // skip if not enough leftover
        if (item.length > leftover) {
          new_snapshot.skipped_items.push(item.path);
        } else {
          new_snapshot.items[depth][item.path] = content;
          new_snapshot.char_count += content.length;
        }
      }
    } else {
      // no limit => just add
      new_snapshot.items[depth][item.path] = content;
      new_snapshot.char_count += content.length;
      has_added_any_item = true;
    }
  }

  return new_snapshot;
}

/**
 * clone_snapshot_shallow
 * Returns a shallow copy of the snapshot so we can modify items, truncated_items, etc.
 *
 * @param {Object} snapshot
 * @returns {Object} Shallow clone
 */
function clone_snapshot_shallow(snapshot) {
  return {
    ...snapshot,
    items: { ...snapshot.items },
    truncated_items: [...snapshot.truncated_items],
    skipped_items: [...snapshot.skipped_items],
    missing_items: [...snapshot.missing_items]
  };
}

/**
 * snapshot_has_any_items
 * True if the snapshot already has at least one item at any depth.
 *
 * @param {Object} snapshot
 * @returns {boolean}
 */
function snapshot_has_any_items(snapshot) {
  return Object.values(snapshot.items).some(obj => Object.keys(obj).length > 0);
}

/**
 * leftover_chars
 * @param {number} current_count
 * @param {number} max_len
 * @returns {number} leftover
 */
function leftover_chars(current_count, max_len) {
  if (!max_len || max_len <= 0) return 0;
  return Math.max(0, max_len - current_count);
}

/**
 * reached_limit
 * True if we've already reached or exceeded the max_len in the snapshot.
 *
 * @param {number} current_count
 * @param {number} max_len
 * @returns {boolean}
 */
function reached_limit(current_count, max_len) {
  if (!max_len || max_len <= 0) return false;
  return current_count >= max_len;
}
