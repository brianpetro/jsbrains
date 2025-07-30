import { get_item_display_name } from "smart-collections/utils/get_item_display_name.js";

export function get_block_display_name(key, show_full_path) {
  const [source_key, ...path_parts] = key.split("#").filter(Boolean);
  const source_name = get_item_display_name(source_key, show_full_path);
  if (show_full_path) return [source_name, ...path_parts].join(" > ");
  const last_heading = path_parts.findLast(part => part && part[0] !== "{");
  return [source_name, last_heading].join(" > ");
}
