/**
 * @file snapshot.js
 * @description
 * Provides a functional approach to building a context_snapshot from a SmartContext item:
 *   - Merging user options with local and collection defaults
 *   - Handling folder references
 *   - Gathering items in ascending size order for each depth
 *   - If an item contains ```smart-context code blocks```, the referenced paths are added at the same depth
 *   - For the very first item in a snapshot, if it's bigger than max_len, partially truncate
 *   - Once something is included, subsequent items that don't fit are skipped
 *   - Respects exclusions (excluded_headings, etc.)
 */
import fs from 'fs'; // for external codeblock references
import { respect_exclusions } from './respect_exclusions.js';

/**
 * build_snapshot
 * @async
 * @param {SmartContext} ctx_item - The SmartContext instance
 * @param {Object} merged_opts - Already-merged user + item + collection opts
 * @returns {Promise<object>} context_snapshot
 */
export async function build_snapshot(ctx_item, merged_opts) {
  const snapshot = {
    items: {},
    truncated_items: [],
    skipped_items: [],
    char_count: 0,
    missing_items: []
  };

  // Depth 0
  await process_items_at_depth_zero(ctx_item, merged_opts, snapshot);

  // Depth 1..link_depth
  if (merged_opts.link_depth > 0) {
    await process_links(ctx_item, merged_opts, snapshot);
  }

  // Remove empty depth=0 if no items were actually added
  if (
    snapshot.items.hasOwnProperty('0') &&
    Object.keys(snapshot.items[0]).length === 0
  ) {
    delete snapshot.items[0];
  }

  if (Object.keys(snapshot.items).length === 0) {
    snapshot.items = {};
  }

  // Apply heading/section exclusions
  await respect_exclusions_on_snapshot(snapshot, merged_opts);

  return snapshot;
}

/**
 * process_items_at_depth_zero
 * Gathers items from ctx_item.data.context_items, 
 * sorts them by content length ascending, then adds or truncates/skips
 * based on the 'first item partial' vs. 'subsequent skip' rule.
 */
async function process_items_at_depth_zero(ctx_item, merged_opts, snapshot) {
  const context_items = ctx_item.data.context_items || {};
  let expansions = [];

  // Expand folders (if any) or treat single paths
  for (const [path_or_key, flag] of Object.entries(context_items)) {
    if (!flag) continue;
    const sub = await expand_path_or_folder(ctx_item, path_or_key);
    expansions.push(...sub);
  }

  // Now read content for each item (plus any smart-context codeblock references)
  const with_lengths = await gather_items_with_lengths(expansions, ctx_item, merged_opts, snapshot);

  // Sort ascending by length
  with_lengths.sort((a, b) => a.length - b.length);

  snapshot.items[0] = {};
  const depth0 = snapshot.items[0];
  let has_added_any_item = false;

  for (const itemObj of with_lengths) {
    // Check max_len
    if (merged_opts.max_len > 0 && snapshot.char_count >= merged_opts.max_len) {
      snapshot.skipped_items.push(itemObj.path);
      continue;
    }

    const leftover = merged_opts.max_len
      ? merged_opts.max_len - snapshot.char_count
      : 0;

    let content_to_add = itemObj.content_str;
    if (merged_opts.max_len > 0) {
      // If no item has been added yet, we allow partial truncation
      if (!has_added_any_item) {
        if (content_to_add.length > leftover) {
          // partial
          content_to_add = content_to_add.slice(0, leftover);
          snapshot.truncated_items.push(itemObj.path);
        }
        depth0[itemObj.path] = content_to_add;
        snapshot.char_count += content_to_add.length;
        has_added_any_item = true;
      } else {
        // Already included something => skip if doesn't fit fully
        if (itemObj.length > leftover) {
          snapshot.skipped_items.push(itemObj.path);
        } else {
          depth0[itemObj.path] = content_to_add;
          snapshot.char_count += content_to_add.length;
        }
      }
    } else {
      // no max_len => no skipping or truncation
      depth0[itemObj.path] = content_to_add;
      snapshot.char_count += content_to_add.length;
      has_added_any_item = true;
    }
  }

  // If none got added, depth0 remains empty => cleaned up above
}

/**
 * process_links => depth=1..n
 * For each depth, gather outlinks (and possibly inlinks), measure size ascending.
 * The same partial vs skip logic applies. If the entire snapshot is still empty,
 * the first item can be partially truncated. Otherwise, skip if it doesn't fit.
 */
async function process_links(ctx_item, merged_opts, snapshot) {
  for (let depth = 1; depth <= merged_opts.link_depth; depth++) {
    snapshot.items[depth] = {};
    const prev_depth_obj = snapshot.items[depth - 1] || {};
    const prev_keys = Object.keys(prev_depth_obj);
    if (prev_keys.length === 0) {
      // no items from previous depth => no links to follow
      delete snapshot.items[depth];
      continue;
    }

    let all_candidates = [];
    for (const prev_key of prev_keys) {
      const item_ref = await ctx_item.get_ref(prev_key);
      if (!item_ref) continue;

      const outlinks = item_ref.outlinks || [];
      const inlinks = merged_opts.inlinks ? (item_ref.inlinks || []) : [];
      const combined = [...outlinks, ...inlinks];

      for (const link_key of combined) {
        if (already_in_snapshot(link_key, snapshot)) continue;
        all_candidates.push(link_key);
      }
    }

    // Expand each link => read content => plus any codeblock lines
    const expansions = [];
    for (const linkKey of all_candidates) {
      const sub = await expand_path_or_folder(ctx_item, linkKey);
      expansions.push(...sub);
    }

    const with_lengths = await gather_items_with_lengths(expansions, ctx_item, merged_opts, snapshot);
    with_lengths.sort((a, b) => a.length - b.length);

    const depth_obj = snapshot.items[depth];
    let has_added_any_item = Object.values(snapshot.items)
      .some(v => Object.keys(v).length > 0);

    for (const itemObj of with_lengths) {
      if (merged_opts.max_len > 0 && snapshot.char_count >= merged_opts.max_len) {
        snapshot.skipped_items.push(itemObj.path);
        continue;
      }
      const leftover = merged_opts.max_len
        ? merged_opts.max_len - snapshot.char_count
        : 0;

      let content_to_add = itemObj.content_str;
      if (merged_opts.max_len > 0) {
        if (!has_added_any_item) {
          // partial if first item in entire snapshot
          if (content_to_add.length > leftover) {
            content_to_add = content_to_add.slice(0, leftover);
            snapshot.truncated_items.push(itemObj.path);
          }
          depth_obj[itemObj.path] = content_to_add;
          snapshot.char_count += content_to_add.length;
          has_added_any_item = true;
        } else {
          // skip if doesn't fit
          if (itemObj.length > leftover) {
            snapshot.skipped_items.push(itemObj.path);
          } else {
            depth_obj[itemObj.path] = content_to_add;
            snapshot.char_count += content_to_add.length;
          }
        }
      } else {
        // no limit => add fully
        depth_obj[itemObj.path] = content_to_add;
        snapshot.char_count += content_to_add.length;
        has_added_any_item = true;
      }
    }

    if (Object.keys(snapshot.items[depth]).length === 0) {
      delete snapshot.items[depth];
    }
  }
}

/**
 * Gathers item expansions => read content => parse 'smart-context' codeblocks => 
 * add them as expansions at the same depth => returns array with { path, content_str, length }.
 *
 * **IMPORTANT FIX**: We must check `already_in_snapshot` with the actual snapshot,
 * instead of accidentally passing the SmartContext item.
 */
async function gather_items_with_lengths(expansions, ctx_item, merged_opts, snapshot) {
  const results = [];

  for (const candidate of expansions) {
    let content = await candidate.contentFn();
    if (content === false) {
      snapshot.missing_items.push(candidate.path);
      continue;
    }
    if (content == null) continue;
    if (typeof content !== 'string') {
      console.log("content is not a string", content, candidate.path);
      continue;
    }
    const base_path = ctx_item.env?.smart_sources?.fs?.base_path || '';
    const codeblock_refs = parse_smart_context_codeblock_lines(content, base_path);
    for (const codeblock_ref of codeblock_refs) {
      const alreadyInExp = expansions.some(e => e.path === codeblock_ref.path) 
        || results.some(r => r.path === codeblock_ref.path)
        || already_in_snapshot(codeblock_ref.path, snapshot);

      if (!alreadyInExp) {
        const sub = await expand_path_or_folder(ctx_item, codeblock_ref.path, true);
        expansions.push(...sub);
      }
    }


    results.push({
      path: candidate.path,
      content_str: content,
      length: content.length
    });
  }
  return results;
}

/**
 * After building, run respect_exclusions
 * If parse_blocks returns no blocks, fallback to a simple line-based heading removal.
 */
async function respect_exclusions_on_snapshot(snapshot, merged_opts) {
  const ex_heads = merged_opts.excluded_headings || [];
  if (!ex_heads.length) return;
  await respect_exclusions(snapshot, { excluded_headings: ex_heads });
}

/**
 * Expand path or treat as single file. Uses `env.smart_fs` if available.
 * If the path is a folder, returns sub-files. If path is a file, returns single item.
 */
async function expand_path_or_folder(ctx_item, path_or_key, external=false) {
  const _fs = external ? fs : ctx_item.env?.smart_sources?.fs || ctx_item.env?.smart_fs;
  const results = [];
  if (!external && (!_fs || typeof _fs.stat !== 'function' || typeof _fs.list_files_recursive !== 'function')) {
    console.log("no fs or no list_files_recursive", _fs);
    // fallback => treat everything as a file
    results.push({
      path: path_or_key,
      contentFn: () => read_content_for(ctx_item, path_or_key, external)
    });
    return results;
  }

  try {
    const st = await _fs.stat(path_or_key);
    console.log("stat", st);
    if (st.isDirectory()) {
      // gather direct children
      const files = external
        ? await get_recursive_files(path_or_key)
        : await _fs.list_files_recursive(path_or_key);
      console.log("files", files);
      for (const file of files) {
        if (file.isFile()) {
          results.push({
            path: file.path,
            contentFn: () => read_content_for(ctx_item, file.path, external)
          });
        }
      }
      return results;
    }
  } catch (e) {
    // ignore => treat as file
    // console.log("error", e);
  }

  // fallback: treat as file
  results.push({
    path: path_or_key,
    contentFn: () => read_content_for(ctx_item, path_or_key, external)
  });
  return results;
}

async function get_recursive_files(path) {
  const files = fs.readdirSync(path);
  const results = [];
  for (const file of files) {
    const filePath = path.join(path, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      results.push(...get_recursive_files(filePath));
    } else {
      results.push({
        path: filePath,
        isFile: () => true
      });
    }
  }
  console.log("get_recursive_files", results);
  return results;
}

/**
 * read_content_for
 * Reads content from either a known item reference or from the file system.
 */
async function read_content_for(ctx_item, key, external=false) {
  // If there's a recognized item reference that can read itself:
  const ref = ctx_item.get_ref?.(key);
  if (ref && typeof ref.read === 'function') {
    return (await ref.read()) || '';
  }

  // Otherwise use the environment's smart_fs
  const _fs = external ? fs : ctx_item.env?.smart_sources?.fs || ctx_item.env?.smart_fs;
  if (_fs && typeof _fs.read === 'function') {
    try {
      if (await _fs.exists(key)) {
        return (await _fs.read(key)) || '';
      }
      return false;
    } catch (err) {
      // file read error => skip
      console.log("file read error", key);
      return '';
    }
  }
  return '';
}

/**
 * parse_smart_context_codeblock_lines
 * Looks for ```smart-context ...``` blocks in the file content, returning each line inside them.
 */
export function parse_smart_context_codeblock_lines(content, root_path) {
  const lines = content.split('\n');
  let inside = false;
  const results = [];

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('```smart-context')) {
      inside = true;
      continue;
    }
    if (inside && trimmed.startsWith('```')) {
      inside = false;
      continue;
    }
    if (inside) {
      // Each non-empty line is presumably a path reference
      const ref = trimmed;
      // count level_ups (../)
      const level_ups = (ref.match(/\.\.\//g) || []).length;
      const path = root_path.split('/').slice(0, -level_ups).join('/') + '/' + ref.replace(/\.\.\//g, '');
      if (ref) {
        results.push({
          path: path,
          external: true
        });
      }
    }
  }
  return results;
}

/**
 * Returns true if link_key is found among snapshot.items[*]
 */
function already_in_snapshot(link_key, snapshot) {
  // The old bug was accidentally passing ctx_item instead of snapshot.
  // We must pass snapshot so we can do:
  return Object.values(snapshot.items).some(obj => (link_key in obj));
}
