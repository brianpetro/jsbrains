import { strip_excluded_headings } from './respect_exclusions.js';
export async function get_snapshot(ctx_item, opts) {
  const snapshot = {
    items: {},
    truncated_items: [],
    skipped_items: [],
    missing_items: [],
    char_count: opts.items ? Object.values(opts.items).reduce((acc, i) => acc + i.char_count, 0) : 0,
  };
  const keys_at_depth = {};
  keys_at_depth[0] = Object.keys(ctx_item.data.context_items);
  const max_depth = opts.link_depth ?? 0;
  for (let depth = 0; depth <= max_depth; depth++) {
    const curr_depth = await process_depth(snapshot, keys_at_depth[depth], ctx_item, opts);
    snapshot.items[depth] = curr_depth;
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
async function process_depth(snapshot, curr_depth_keys, ctx_item, opts) {
  const curr_depth_items = (curr_depth_keys ?? []).map(key => ctx_item.get_ref(key)).filter(Boolean);
  const curr_depth_non_item_keys = curr_depth_keys.filter(key => !ctx_item.get_ref(key));
  // check if is folder
  for (const key of curr_depth_non_item_keys) {
    const smart_fs = ctx_item.env.smart_sources.fs;
    const files = await smart_fs.adapter.list_files_recursive(key);
    for (const file of files) {
      if (is_already_in_snapshot(file.path, snapshot)) {
        continue;
      }
      const item = ctx_item.get_ref(file.path);
      if(item) {
        curr_depth_items.push(item);
      }
    }
  }
  const curr_depth = {};
  for (const item of curr_depth_items) {
    if (is_already_in_snapshot(item.key, snapshot)) {
      continue;
    }
    const content = await item.read();
    const [new_content, exclusions, removed_char_count] = strip_excluded_headings(content, opts.excluded_headings);
    curr_depth[item.path] = {
      ref: item,
      path: item.path,
      content: new_content,
      char_count: new_content.length,
      exclusions,
      excluded_char_count: removed_char_count,
    };
  }
  return curr_depth;
}

function is_already_in_snapshot(item_path, snapshot) {
  return Object.values(snapshot.items).some(depth => depth[item_path]);
}

