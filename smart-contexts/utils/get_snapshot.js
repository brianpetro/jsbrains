import { strip_excluded_headings } from './respect_exclusions.js';
import { get_markdown_links } from 'smart-sources/utils/get_markdown_links.js';

/**
 * @function get_snapshot
 * @description Builds a snapshot of items up to `opts.link_depth`, possibly including inbound links
 * if `opts.inlinks` is set. Applies heading exclusions. Optionally ignores outlinks from
 * excluded sections if 'follow_links_in_excluded' = false.
 * @param {SmartContext} context_item
 * @param {object} opts
 * @property {boolean} [opts.inlinks=false]
 * @property {boolean} [opts.follow_links_in_excluded=true]
 * @property {number} [opts.link_depth=0]
 * @property {number} [opts.max_len=0]
 * @property {string[]} [opts.excluded_headings]
 * @returns {Promise<object>} snapshot
 */
export async function get_snapshot(context_item, opts) {
  const snapshot = {
    items: {},
    truncated_items: [],
    skipped_items: [],
    missing_items: [],
    images: [],
    char_count: opts.items ? Object.values(opts.items).reduce((acc, i) => acc + i.char_count, 0) : 0,
  };

  const keys_at_depth = {};
  keys_at_depth[0] = Object.keys(context_item.data.context_items);

  const max_depth = opts.link_depth ?? 0;

  // For each depth level from 0..max_depth, gather items
  for (let depth = 0; depth <= max_depth; depth++) {
    const curr_depth = await process_depth(
      snapshot,
      keys_at_depth[depth],
      context_item,
      opts
    );
    snapshot.items[depth] = curr_depth;

    // Plan next depth's keys
    if (depth !== max_depth) {
      keys_at_depth[depth + 1] = Object.keys(Object.values(curr_depth).reduce((acc, i) => {
        if(opts.inlinks) {
          i.ref.inlinks.forEach(inlink => {
            if(!is_already_in_snapshot(inlink.path, snapshot)) {
              acc[inlink] = true;
            }
          });
        }
        i.ref.outlinks.forEach(outlink => {
          if(!is_already_in_snapshot(outlink.path, snapshot)) {
            acc[outlink] = true;
          }
        });
        return acc;
      }, {}));
    }
  }
  if(opts.items) {
    snapshot.items[0] = {
      ...snapshot.items[0],
      ...opts.items,
    };
  }
  return snapshot;
}

/**
 * @async
 * @function process_depth
 * @description Reads the given item keys, handles folder expansions, applies heading exclusions,
 * and (optionally) re-parses outlinks from stripped content if 'follow_links_in_excluded' is false.
 */
async function process_depth(snapshot, curr_depth_keys, context_item, opts) {
  const source_items = (curr_depth_keys ?? []).map(key => context_item.get_ref(key)).filter(Boolean);
  const non_source_keys = curr_depth_keys.filter(key => !context_item.get_ref(key));
  // check if is folder
  for (const key of non_source_keys) {
    const smart_fs = context_item.env.smart_sources.fs;
    const files = await smart_fs.adapter.list_files_recursive(key);
    if(!files.length) {
      snapshot.missing_items.push(key);
      continue;
    }
    for (const file of files) {
      if (is_already_in_snapshot(file.path, snapshot)) {
        continue;
      }
      const item = context_item.get_ref(file.path);
      if(item) {
        source_items.push(item);
      }else{
        const image_exts = ['png','jpg','jpeg','gif','webp','svg','bmp','ico'];
        if(image_exts.some(ext => file.path.endsWith(`.${ext}`))) {
          snapshot.images.push(file.path);
        }else{
          snapshot.missing_items.push(file.path);
        }
      }
    }
  }
  const curr_depth = {};
  for (const item of source_items) {
    if (is_already_in_snapshot(item.key, snapshot)) {
      continue;
    }
    let content = await item.read();
    console.log('read context');
    if(!opts.calculating && content.includes('dataview')) {
      content = await item.read({render_output: true});
      item.data.outlinks = get_markdown_links(content);
    }

    // Exclude headings if needed
    const excluded_headings = opts.excluded_headings || [];
    const [new_content, exclusions, removed_char_count] =
      strip_excluded_headings(content, excluded_headings);

    // If we do NOT want to follow links in excluded headings, parse outlinks from the stripped content
    if (opts.follow_links_in_excluded === false) {
      item.data.outlinks = get_markdown_links(new_content);
    }
    snapshot.char_count += new_content.length;

    curr_depth[item.path] = {
      ref: item,
      path: item.path,
      content: new_content,
      mtime: item.mtime,
      char_count: new_content.length,
      exclusions,
      excluded_char_count: removed_char_count
    };
  }
  return curr_depth;
}

/**
 * @function is_already_in_snapshot
 * @description Returns true if item_path is already included in any depth.
 */
function is_already_in_snapshot(item_path, snapshot) {
  return Object.values(snapshot.items).some((depthObj) => depthObj?.[item_path]);
}
