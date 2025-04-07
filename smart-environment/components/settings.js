export async function build_html(env, opts = {}) {
  const env_settings_html = Object.entries(env.settings_config).map(([setting_key, setting_config]) => {
    if (!setting_config.setting) setting_config.setting = setting_key;
    return this.render_setting_html(setting_config);
  }).join('\n');
  const env_collections_containers_html = Object.entries(env.collections).map(([collection_key, collection]) => {
    return `<div data-smart-settings="${collection_key}"></div>`;
  }).join('\n');
  const html = `
    <div class="">
      ${env_settings_html}
      ${env_collections_containers_html}
    </div>
  `;
  return html;
}

export async function render(env, opts = {}) {
  const html = await build_html.call(this, env, opts);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, env, frag, opts);
}

export async function post_process(env, frag, opts = {}) {
  await this.render_setting_components(frag, {scope: env});
  const env_collections_containers = frag.querySelectorAll('[data-smart-settings]');
  for(const env_collections_container of env_collections_containers){
    const collection_key = env_collections_container.dataset.smartSettings;
    const collection = env[collection_key];
    await collection.render_settings(env_collections_container);
  }
  return frag;
}