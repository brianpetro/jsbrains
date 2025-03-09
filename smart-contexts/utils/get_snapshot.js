import { strip_excluded_headings } from './respect_exclusions.js';
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
  for (let depth = 0; depth <= max_depth; depth++) {
    const curr_depth = await process_depth(snapshot, keys_at_depth[depth], context_item, opts);
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
    const content = await item.read();
    const excluded_headings = opts.excluded_headings || [];
    const [new_content, exclusions, removed_char_count] = strip_excluded_headings(content, excluded_headings);
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

