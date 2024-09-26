export async function render(scope, opts = {}) {
  const env_settings_html = Object.entries(scope.settings_config).map(([setting_key, setting_config]) => {
    if (!setting_config.setting) setting_config.setting = setting_key;
    if(this.validate_setting(scope, opts, setting_key, setting_config)) return this.render_setting_html(setting_config);
    return '';
  }).join('\n');
  const env_collections_containers_html = Object.entries(scope.collections).map(([collection_key, collection]) => {
    return `<div data-smart-settings="${collection_key}"></div>`;
  }).join('\n');
  const html = `
    <div class="">
      ${env_settings_html}
      ${env_collections_containers_html}
    </div>
  `;
  const frag = this.create_doc_fragment(html);
  return post_process.call(this, scope, frag, opts);
}

export async function post_process(scope, frag, opts = {}) {
  await this.render_setting_components(frag, {scope});
  const env_collections_containers = frag.querySelectorAll('[data-smart-settings]');
  for(const env_collections_container of env_collections_containers){
    const collection_key = env_collections_container.dataset.smartSettings;
    const collection = scope[collection_key];
    await collection.render_settings(env_collections_container);
  }
  return frag;
}