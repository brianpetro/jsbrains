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
  await this.render_setting_components(frag, {scope});
  return post_process(scope, frag, opts);
}

export async function post_process(scope, frag, opts = {}) {
  frag.querySelector('.sources-load-btn')?.addEventListener('click', () => {
    scope.run_load();
  });
  frag.querySelector('.sources-import-btn')?.addEventListener('click', () => {
    scope.run_import();
  });
  frag.querySelector('.sources-refresh-btn')?.addEventListener('click', () => {
    scope.run_refresh();
  });
  return frag;
}

function settings_header_html(scope, opts = {}) {
  const heading_text = scope.collection_key.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  const span_html = get_span_html(scope);
  const button_html = get_button_html(scope);
  return `<div class="group-header">
    <h3>${heading_text}</h3>
    ${span_html}
    ${button_html}
  </div>`;
}

function get_span_html(scope) {
  const files_ct = Object.values(scope.items).length;
  const item_name = scope.collection_key === 'smart_sources' ? 'files' : 'blocks';
  if(!scope.loaded) return `<span>${files_ct} ${item_name} (embeddings not currently loaded)</span>`;
  const embedded_ct = Object.values(scope.items).filter(item => item.vec).length;
  return `<span>Embedded: ${embedded_ct} / ${files_ct}</span>`;
}

function get_button_html(scope) {
  if(scope.collection_key !== 'smart_sources') return '';
  if(scope.loaded) return `<button class="sources-import-btn">Run Import</button><button class="sources-refresh-btn">Refresh All (prune + import)</button>`;
  return `<button class="sources-load-btn">Load Sources</button>`;
}