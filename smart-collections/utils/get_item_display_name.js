/**
 * Pure helper to format the display name for a collection item.
 * @param {string} key
 * @param {boolean} show_full_path
 * @returns {string}
 */
export function get_item_display_name(key, show_full_path) {
  if (show_full_path) {
    return key.split("/").join(" > ").replace(".md", "");
  }
  return key.split("/").pop().replace(".md", "");
}
