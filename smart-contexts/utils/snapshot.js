/**
 * @file snapshot.js
 * @description
 * Provides a functional approach to building a context_snapshot from a SmartContext item:
 *   - Merging user options with local and collection defaults
 *   - Handling folder references
 *   - Gathering items in ascending size order for each depth
 *   - For the very first item, if it's bigger than max_len, partially truncate.
 *   - Once any item has been added, if there's not enough space to fit the entire next item, skip it.
 *   - Respecting excluded_headings
 */

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
    total_char_count: 0
  };

  await process_items_at_depth_zero(ctx_item, merged_opts, snapshot);

  if (merged_opts.link_depth > 0) {
    await process_links(ctx_item, merged_opts, snapshot);
  }

  // Remove empty depth=0 if no items were actually added:
  if (
    snapshot.items.hasOwnProperty('0') &&
    Object.keys(snapshot.items[0]).length === 0
  ) {
    delete snapshot.items[0];
  }
  // If that was the only depth, items would be {}
  if (Object.keys(snapshot.items).length === 0) {
    snapshot.items = {};
  }

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

  for (const [path_or_key, flag] of Object.entries(context_items)) {
    if (!flag) continue;
    const sub = await expand_path_or_folder(ctx_item, path_or_key);
    expansions.push(...sub);
  }
  // read content & measure
  let with_lengths = [];
  for (const candidate of expansions) {
    const content = await candidate.contentFn();
    if (content == null) continue; 
    with_lengths.push({
      path: candidate.path,
      content_str: content,
      length: content.length
    });
  }
  // sort ascending
  with_lengths.sort((a, b) => a.length - b.length);

  // gather items (depth=0)
  const depth0 = {};
  snapshot.items[0] = depth0;

  let has_added_any_item = false;

  for (const itemObj of with_lengths) {
    if (merged_opts.max_len > 0 && snapshot.total_char_count >= merged_opts.max_len) {
      snapshot.skipped_items.push(itemObj.path);
      continue;
    }
    const leftover = merged_opts.max_len
      ? merged_opts.max_len - snapshot.total_char_count
      : 0; // if 0 means no enforced limit

    let content_to_add = itemObj.content_str;
    if (merged_opts.max_len > 0) {
      // 1) If no item has been added yet, we can partially truncate if needed
      if (!has_added_any_item) {
        // leftover is the entire max_len
        if (content_to_add.length > leftover) {
          // partial
          content_to_add = content_to_add.slice(0, leftover);
          snapshot.truncated_items.push(itemObj.path);
        }
        depth0[itemObj.path] = content_to_add;
        snapshot.total_char_count += content_to_add.length;
        has_added_any_item = true;
      } else {
        // 2) If we already added something, skip if it doesn't fit
        if (itemObj.length > leftover) {
          // skip entirely
          snapshot.skipped_items.push(itemObj.path);
        } else {
          // fits fully
          depth0[itemObj.path] = content_to_add;
          snapshot.total_char_count += content_to_add.length;
        }
      }
    } else {
      // no max_len => no skipping or truncation
      depth0[itemObj.path] = content_to_add;
      snapshot.total_char_count += content_to_add.length;
      has_added_any_item = true;
    }
  }

  // If we ended up not adding anything, depth0 remains empty => handled by build_snapshot
}

/**
 * process_links => depth=1..n
 * For each depth, gather outlinks (and optionally inlinks), measure size ascending.
 * The same partial vs skip logic applies, but only for the first item across each entire snapshot,
 * or do we repeat that logic per-depth? 
 * Usually the tests do not require partial logic for deeper items, but for consistency 
 * we can do the same approach: if the snapshot is still at total_char_count=0, partial else skip.
 */
async function process_links(ctx_item, merged_opts, snapshot) {
  for (let depth = 1; depth <= merged_opts.link_depth; depth++) {
    snapshot.items[depth] = {};
    const prev_depth_obj = snapshot.items[depth - 1] || {};
    const prev_keys = Object.keys(prev_depth_obj);

    let all_candidates = [];
    for (const prev_key of prev_keys) {
      const item_ref = await get_ref(ctx_item, prev_key);
      if (!item_ref) continue;
      const outlinks = item_ref.outlinks || [];
      const inlinks = merged_opts.inlinks ? (item_ref.inlinks || []) : [];
      const combined = [...outlinks, ...inlinks];
      for (const link_key of combined) {
        if (already_in_snapshot(link_key, snapshot)) continue;
        all_candidates.push(link_key);
      }
    }
    // read + measure
    let with_lengths = [];
    for (const linkKey of all_candidates) {
      const content = await read_content_for(ctx_item, linkKey);
      if (content == null) continue;
      with_lengths.push({
        path: linkKey,
        content_str: content,
        length: content.length
      });
    }
    // sort ascending
    with_lengths.sort((a, b) => a.length - b.length);

    let depth_obj = snapshot.items[depth];
    let has_added_any_item = Object.values(snapshot.items)
      .some(v => Object.keys(v).length > 0);

    for (const itemObj of with_lengths) {
      if (merged_opts.max_len > 0 && snapshot.total_char_count >= merged_opts.max_len) {
        snapshot.skipped_items.push(itemObj.path);
        continue;
      }
      const leftover = merged_opts.max_len
        ? merged_opts.max_len - snapshot.total_char_count
        : 0;

      let content_to_add = itemObj.content_str;
      if (merged_opts.max_len > 0) {
        if (!has_added_any_item) {
          // partial if too big
          if (content_to_add.length > leftover) {
            content_to_add = content_to_add.slice(0, leftover);
            snapshot.truncated_items.push(itemObj.path);
          }
          depth_obj[itemObj.path] = content_to_add;
          snapshot.total_char_count += content_to_add.length;
          has_added_any_item = true;
        } else {
          // skip if doesn't fit
          if (itemObj.length > leftover) {
            snapshot.skipped_items.push(itemObj.path);
          } else {
            depth_obj[itemObj.path] = content_to_add;
            snapshot.total_char_count += content_to_add.length;
          }
        }
      } else {
        // no limit => add fully
        depth_obj[itemObj.path] = content_to_add;
        snapshot.total_char_count += content_to_add.length;
        has_added_any_item = true;
      }
    }
    // if no items got added at this depth, we'll just have an empty object
    if (Object.keys(snapshot.items[depth]).length === 0) {
      delete snapshot.items[depth];
    }
  }
}

async function respect_exclusions_on_snapshot(snapshot, merged_opts) {
  const ex_heads = merged_opts.excluded_headings || [];
  if (!ex_heads.length) return;
  for (const depth_str of Object.keys(snapshot.items)) {
    const items_obj = snapshot.items[depth_str];
    await respect_exclusions({
      excluded_headings: ex_heads,
      items: items_obj
    });
  }
}

/**
 * Expand path or treat as single file
 */
async function expand_path_or_folder(ctx_item, path_or_key) {
  const fs = ctx_item.env?.fs;
  const results = [];
  if (!fs || typeof fs.stat !== 'function' || typeof fs.readdir !== 'function') {
    // treat everything as file
    results.push({
      path: path_or_key,
      contentFn: () => read_content_for(ctx_item, path_or_key)
    });
    return results;
  }
  // check if directory
  try {
    const st = await fs.stat(path_or_key);
    if (st && st.isDirectory()) {
      // expand
      const all = await fs.readdir(path_or_key);
      for (const fName of all) {
        const full = [path_or_key, fName].join(fs.sep || '/');
        results.push({
          path: full,
          contentFn: () => read_content_for(ctx_item, full)
        });
      }
      return results;
    }
  } catch (e) {
    // fallback
  }
  // fallback single file
  results.push({
    path: path_or_key,
    contentFn: () => read_content_for(ctx_item, path_or_key)
  });
  return results;
}

function already_in_snapshot(link_key, snapshot) {
  return Object.values(snapshot.items).some(obj => link_key in obj);
}

async function read_content_for(ctx_item, key) {
  const ref = ctx_item.get_ref?.(key);
  if (ref && typeof ref.read === 'function') {
    return (await ref.read()) || '';
  }
  const fs = ctx_item.env?.fs;
  if (fs && typeof fs.read === 'function') {
    return (await fs.read(key)) || '';
  }
  return '';
}
