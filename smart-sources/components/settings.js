export async function build_html(sources_collection, opts={}){
  const settings_html = Object.entries(sources_collection.settings_config).map(([setting_key, setting_config]) => {
    if (!setting_config.setting) setting_config.setting = setting_key;
    if(this.validate_setting(sources_collection, opts, setting_key, setting_config)) return this.render_setting_html(setting_config);
    return '';
  }).join('\n');
  const html = `<div class="source-settings">
    ${settings_header_html(sources_collection, opts)}
    ${settings_html}
  </div>`;
  return html;
}

export async function render(source_collection, opts = {}) {
  const html = await build_html.call(this, source_collection, opts);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, source_collection, frag, opts);
}

export async function post_process(source_collection, frag, opts = {}) {
  await this.render_setting_components(frag, {scope: source_collection});
  
  return frag;
}

function settings_header_html(scope, opts = {}) {
  const heading_text = scope.collection_key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  const heading_html = scope.collection_key === 'smart_sources' 
    ? get_source_heading_html(scope) 
    : get_block_heading_html(scope);
  return `<div class="group-header">
    <h2>${heading_text}</h2>
    ${heading_html}
  </div>`;
}

function get_source_heading_html(scope) {
  const item_count = Object.keys(scope.items).length;
  
  if (!scope.loaded) {
    return `<span>${item_count} sources (embeddings not currently loaded)</span>`;
  }

  const total_count = scope.total_files;
  const included_count = scope.included_files;
  if (scope.loaded !== included_count) {
    return `<span>${scope.loaded}/${included_count} sources (partially loaded, should refresh/reload)</span>`;
  }

  const embedded_items = Object.values(scope.items).filter(item => item.vec);
  const embedded_percentage = Math.round((embedded_items.length / item_count) * 100);
  const load_time_html = scope.load_time_ms ? `<span>Load time: ${scope.load_time_ms}ms</span>` : '';

  return `
    <span>${embedded_percentage}% embedded</span>
    ${embedded_percentage === 0 ? "<span><b>Should run Re-import to re-embed</b></span>" : ''}
    <span>${included_count} included</span>
    <span>${total_count - included_count} excluded</span>
    ${load_time_html}
  `;
}

function get_block_heading_html(scope) {
  const item_count = Object.keys(scope.items).length;
  
  if (!scope.loaded) {
    return `<span>${item_count} blocks (embeddings not currently loaded)</span>`;
  }

  if (scope.loaded !== item_count) {
    return `<span>${scope.loaded}/${item_count} (loaded/total)</span>`;
  }

  const items_w_vec = Object.values(scope.items).filter(item => item.vec).length;
  const embedded_percentage = Math.round((items_w_vec / item_count) * 100);
  const load_time_html = scope.load_time_ms ? `<span>Load time: ${scope.load_time_ms}ms</span>` : '';

  return `
    <span>${embedded_percentage}% embedded (${items_w_vec}/${item_count})</span>
    <!--<span>Loaded: ${item_count} blocks (expected ${scope.expected_blocks_ct})</span>-->
    ${load_time_html}
  `;
}
