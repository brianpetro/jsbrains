export async function render(scope, opts = {}) {
  const html = Object.entries(scope.settings_config).map(([setting_key, setting_config]) => {
    if (!setting_config.setting) setting_config.setting = setting_key;
    return this.render_setting_html(setting_config);
  }).join('\n');
  const heading_html = `<h2>${scope.collection_key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Settings</h2>`;
  const frag = this.create_doc_fragment(heading_html + html);
  return await post_process.call(this, scope, frag, opts);
}

export async function post_process(scope, frag, opts = {}) {
  await this.render_setting_components(frag, {scope});
  return frag;
}