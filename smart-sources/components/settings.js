export async function render(scope, opts = {}) {
  const settings_html = Object.entries(scope.settings_config).map(([setting_key, setting_config]) => {
    if (!setting_config.setting) setting_config.setting = setting_key;
    if(this.validate_setting(scope, opts, setting_key, setting_config)) return this.render_setting_html(setting_config);
    return '';
  }).join('\n');
  const html = `<div class="source-settings">
    ${settings_header_html(scope, opts)}
    ${settings_html}
  </div>`
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, scope, frag, opts);
}

export async function post_process(source_collection, frag, opts = {}) {
  await this.render_setting_components(frag, {scope: source_collection});
  
  frag.querySelector('.sources-load-btn')?.addEventListener('click', () => {
    source_collection.run_data_load();
  });
  
  if (source_collection.loaded) {
    frag.querySelector('.sources-import-btn')?.addEventListener('click', () => {
      source_collection.run_import();
    });
    
    frag.querySelector('.sources-prune-btn')?.addEventListener('click', () => {
      source_collection.run_prune();
    });
    
    frag.querySelector('.sources-clear-all-btn')?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all data and re-import? This action cannot be undone.')) {
        await source_collection.run_clear_all();
        source_collection.render_settings();
        source_collection.block_collection.render_settings();
      }
    });
  }
  
  return frag;
}

function settings_header_html(scope, opts = {}) {
  const heading_text = scope.collection_key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  const heading_html = scope.collection_key === 'smart_sources' 
    ? get_source_heading_html(scope) 
    : get_block_heading_html(scope);
  const button_html = get_button_html(scope);
  return `<div class="group-header">
    <h2>${heading_text}</h2>
    ${heading_html}
    ${button_html}
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
    <span>${included_count} sources included (${total_count} total)</span>
    ${load_time_html}
  `;
}

function get_block_heading_html(scope) {
  const item_count = Object.keys(scope.items).length;
  
  if (!scope.loaded) {
    return `<span>${item_count} blocks (embeddings not currently loaded)</span>`;
  }

  if (scope.loaded !== item_count) {
    return `<span>${scope.loaded}/${item_count} blocks (partially loaded, should refresh/reload)</span>`;
  }

  const items_w_vec = Object.values(scope.items).filter(item => item.vec).length;
  const embedded_percentage = Math.round((items_w_vec / item_count) * 100);
  const load_time_html = scope.load_time_ms ? `<span>Load time: ${scope.load_time_ms}ms</span>` : '';

  return `
    <span>${embedded_percentage}% embedded (${items_w_vec})</span>
    <span>Loaded: ${item_count} blocks (expected ${scope.expected_blocks_ct})</span>
    ${load_time_html}
  `;
}

function get_button_html(scope) {
  if(scope.collection_key !== 'smart_sources') return '';
  
  const load_btn_html = `<button class="sources-load-btn">${scope.loaded ? 'Re-load' : 'Load'} Sources</button>`;
  
  let additional_buttons = '';
  if (scope.loaded) {
    additional_buttons = `
      <button class="sources-import-btn">Import</button>
      <button class="sources-prune-btn">Prune</button>
      <button class="sources-clear-all-btn">Clear All &amp; Re-import</button>
    `;
  }
  
  return `
    ${load_btn_html}
    ${additional_buttons}
  `;
}
