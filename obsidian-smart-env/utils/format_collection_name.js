/**
 * Converts "smart_sources" -> "Smart Sources", etc.
 */
export function format_collection_name(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
