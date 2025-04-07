/**
 * env_stats.js
 *
 * A standalone component that displays stats for every collection in `env.collections`,
 * and calculates embedding coverage in a more consistent, clearer way.
 *
 * Exported functions:
 *  - build_html(env, opts) => string of HTML
 *  - render(env, opts) => DocumentFragment
 *  - post_process(env, frag, opts) => DocumentFragment
 *  - calculate_embed_coverage(itemArr) => { needed, embedded, percent, display }
 */

import { format_collection_name } from "../utils/format_collection_name";

export async function build_html(env, opts = {}) {
  const lines = [];
  lines.push(`<h2>Collections</h2>`);

  const collection_keys = Object.keys(env.collections)
    // sort smart_sources and smart_blocks first
    .sort((a, b) => {
      if (a === 'smart_sources' || a === 'smart_blocks') return -1;
      if (b === 'smart_sources' || b === 'smart_blocks') return 1;
      return a.localeCompare(b);
    })
  ;
  console.log('collection_keys', collection_keys);
  // For each collection, produce a stats snippet
  for (const collection_key of collection_keys) {
    const collection = env[collection_key];
    if (!collection || !collection.items) {
      lines.push(`
        <div class="sc-collection-stats">
          <h3>${format_collection_name(collection_key)}</h3>
          <p>No valid items.</p>
        </div>
      `);
      continue;
    }
    const snippet = generate_collection_stats(collection, collection_key);
    lines.push(snippet);
  }

  return `
    <div class="sc-env-stats-container">
      ${lines.join("\n")}
    </div>
  `;
}

export async function render(env, opts = {}) {
  const html = await build_html.call(this, env, opts);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, env, frag, opts);
}

export async function post_process(env, frag, opts = {}) {
  return frag;
}

function generate_collection_stats(collection, collectionKey) {
  const total_items = Object.values(collection.items).length;
  const niceName = format_collection_name(collectionKey);
  const state = collection.env.collections[collectionKey];
  console.log('state', collectionKey, state);

  // If not loaded
  if (state !== 'loaded') {
    return `
      <div class="sc-collection-stats">
        <h3>${niceName}</h3>
        <p>Not loaded yet (${total_items} items known).</p>
      </div>
    `;
  }
  const load_time_html = collection.load_time_ms ? `<span>Load time: ${collection.load_time_ms}ms</span>` : '';
  const state_html = `<span>State: ${state}</span>`;

  // Distinguish "smart_sources" / "smart_blocks" / fallback
  let html = '';
  if (collectionKey === 'smart_sources') {
    html = get_smart_sources_stats(collection, niceName, total_items, );
  } else {
    html = get_generic_collection_stats(collection, niceName, total_items, );
  }
  let embed_stats = '';
  if(typeof collection.process_embed_queue === 'function') {
    embed_stats = calculate_embed_coverage(collection, total_items);
  }
  return `
    <div class="sc-collection-stats">
      <h3>${niceName}</h3>
      ${embed_stats}
      ${html}
      ${load_time_html}
      ${state_html}
    </div>
  `;
}

/**
 * For "smart_sources": show "Total files", "Excluded", "Included", "Embedding coverage"
 */
function get_smart_sources_stats(collection, niceName, total_items, load_time_html) {
  // total_files, included_files, etc. (from collection)
  const totalFiles = collection.total_files ?? total_items;
  const included = collection.included_files ?? 'Error calculating included files'; // fallback
  const excluded = totalFiles - included;

  return `
      <p><strong>Total Files:</strong> ${totalFiles}</p>
      <p><strong>Excluded:</strong> ${excluded}</p>
      <p><strong>Included:</strong> ${included}</p>
  `;
}

/**
 * Fallback for other collections: "Total items", "Embedding coverage"
 */
function get_generic_collection_stats(collection, niceName, total_items, load_time_html) {
  return `
      <p><strong>Total:</strong> ${total_items}</p>
  `;
}
export function calculate_embed_coverage(collection, total_items) {
  const embedded_items = Object.values(collection.items).filter(item => item.vec);
  if(!embedded_items.length) return '<p>No items embedded</p>';
  const is_unembedded = Object.values(collection.items).filter(i => i.should_embed && i.is_unembedded);
  const pct = (embedded_items.length / total_items) * 100;
  const percent = Math.round(pct);
  const display = `${percent}% (${embedded_items.length} / ${total_items})`;
  return `<p><strong>Embedding coverage:</strong> ${display}</p>`
    + (is_unembedded.length ? `<p><strong>Unembedded:</strong> ${is_unembedded.length}</p>` : '')
  ;
}


