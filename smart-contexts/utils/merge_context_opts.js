/**
 * Internal: merges collection-level settings, local item context_opts, and user-supplied opts.
 * @param {object} input_opts
 * @returns {object}
 */
export function merge_context_opts(context_item, input_opts = {}) {
  const cset = context_item.collection.settings || {};
  const local_opts = context_item.data.context_opts || {};

  // Merge templates separately to deep-merge defaults with overrides
  const merged_templates = {
    ...((cset.templates) ? JSON.parse(JSON.stringify(cset.templates)) : {}),
    ...((local_opts.templates && typeof local_opts.templates === "object") ? local_opts.templates : {}),
    ...((input_opts.templates && typeof input_opts.templates === "object") ? input_opts.templates : {})
  };

  return {
    link_depth: input_opts.link_depth ?? local_opts.link_depth ?? cset.link_depth ?? 0,
    inlinks: input_opts.inlinks ?? local_opts.inlinks ?? Boolean(cset.inlinks),
    excluded_headings: input_opts.excluded_headings ?? local_opts.excluded_headings ?? (Array.isArray(cset.excluded_headings) ? [...cset.excluded_headings] : []),
    max_len: input_opts.max_len ?? local_opts.max_len ?? cset.max_len ?? 0,
    templates: merged_templates
  };
}