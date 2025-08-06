/**
 * Build and return a snapshot object for the provided SmartContext instance.
 *
 * @param {import('smart-contexts').SmartContext} ctx
 * @param {Object} opts
 * @param {number}  [opts.link_depth=0]   – maximum depth of out‑/in‑links to follow
 * @param {boolean} [opts.inlinks=false]  – include inbound links as well
 * @param {Object}  [opts.items]          – pre‑hydrated depth‑0 items to merge
 * @returns {Promise<Object>} snapshot
 */
export async function get_snapshot(ctx, opts = {}) {
  const snapshot = {
    items          : {},      // depth ⇒ { path ⇒ item }
    truncated_items: [],
    skipped_items  : [],
    missing_items  : [],
    images         : [],
    char_count     : opts.items
      ? Object.values(opts.items).reduce((p, i) => p + i.char_count, 0)
      : 0,
  };

  /* Track processed paths so we don’t double‑count when traversing depths */
  const seen = new Set(Object.keys(opts.items || {}));

  /* Map of depth ⇒ keys that still need processing */
  const keys_at_depth = { 0: ctx.get_item_keys_by_depth(0) };
  const max_depth     = opts.link_depth ?? 0;

  for (let depth = 0; depth <= max_depth; depth++) {
    const depth_keys = keys_at_depth[depth] || [];
    if (!depth_keys.length) continue;

    /* Resolve keys to ContextItem instances */
    const ctx_items  = ctx.get_context_items(depth_keys);
    const curr_depth = (snapshot.items[depth] = {});

    /* ── add items (mutates `snapshot`) ─────────────────────────────────── */
    for (const item of ctx_items) {
      try {
        await item.add_to_snapshot(snapshot, { ...opts, depth });
        seen.add(item.path);
      } catch (err) {
        snapshot.missing_items.push(item.path);
      }
    }

    /* ── schedule keys for next depth ──────────────────────────────────── */
    if (depth !== max_depth) {
      const accumulate = new Set(keys_at_depth[depth + 1] || []);
      for (const context_item of Object.values(curr_depth)) {
        if (!context_item) continue;                // external items have no ref
        if (opts.inlinks) {
          const inlinks = context_item.inlinks ?? context_item.ref?.inlinks ?? [];
          inlinks.forEach(p => { if (!seen.has(p)) accumulate.add(p); });
        }
        const outlinks = context_item.outlinks ?? context_item.ref?.outlinks ?? [];
        outlinks.forEach(p => { if (!seen.has(p)) accumulate.add(p); });
      }
      keys_at_depth[depth + 1] = Array.from(accumulate);
    }
  }

  /* Merge caller‑supplied items into depth‑0                                */
  if (opts.items) {
    snapshot.items[0] = { ...snapshot.items[0], ...opts.items };
  }

  return snapshot;
}

