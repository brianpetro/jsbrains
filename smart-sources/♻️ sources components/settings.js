export async function build_html(collection, opts={}){
  const settings_html = Object.entries(collection.settings_config).map(([setting_key, setting_config]) => {
    if (!setting_config.setting) setting_config.setting = setting_key;
    return this.render_setting_html(setting_config);
  }).join('\n');
  const html = `<div class="source-settings">
    ${settings_header_html(collection, opts)}
    ${settings_html}
  </div>`;
  return html;
}
function settings_header_html(collection, opts = {}) {
  const heading_text = collection.collection_key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  const heading_html = collection.collection_key === 'smart_sources' 
    ? get_source_heading_html(collection) 
    : get_block_heading_html(collection);
  return `<div class="group-header">
    <h2>${heading_text}</h2>
    ${heading_html}
  </div>`;
}

function get_source_heading_html(collection) {
  const item_count = Object.keys(collection.items).length;
  
  if (!collection.loaded) {
    return `<span>${item_count} sources (embeddings not currently loaded)</span>`;
  }

  const total_count = collection.total_files;
  const included_count = collection.included_files;
  if (collection.loaded !== included_count) {
    return `<span>${collection.loaded}/${included_count} sources (partially loaded, should refresh/reload)</span>`;
  }

  const embedded_items = Object.values(collection.items).filter(item => item.vec);
  const embedded_percentage = Math.round((embedded_items.length / item_count) * 100);
  const load_time_html = collection.load_time_ms ? `<span>Load time: ${collection.load_time_ms}ms</span>` : '';

  return `
    <span>${embedded_percentage}% embedded</span>
    ${embedded_percentage === 0 ? "<span><b>Should run Re-import to re-embed</b></span>" : ''}
    <span>${included_count} included</span>
    <span>${total_count - included_count} excluded</span>
    ${load_time_html}
  `;
}

function get_block_heading_html(collection) {
  const item_count = Object.keys(collection.items).length;
  
  if (!collection.loaded) {
    return `<span>${item_count} blocks (embeddings not currently loaded)</span>`;
  }

  if (collection.loaded !== item_count) {
    return `<span>${collection.loaded}/${item_count} (loaded/total)</span>`;
  }

  const items_w_vec = Object.values(collection.items).filter(item => item.vec).length;
  const embedded_percentage = Math.round((items_w_vec / item_count) * 100);
  const load_time_html = collection.load_time_ms ? `<span>Load time: ${collection.load_time_ms}ms</span>` : '';

  return `
    <span>${embedded_percentage}% embedded (${items_w_vec}/${item_count})</span>
    <!--<span>Loaded: ${item_count} blocks (expected ${collection.expected_blocks_ct})</span>-->
    ${load_time_html}
  `;
}

export async function render(collection, opts = {}) {
  const html = await build_html.call(this, collection, opts);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, collection, frag, opts);
}

export async function post_process(collection, frag, opts = {}) {
  await this.render_setting_components(frag, {scope: collection});
  
  return frag;
}
