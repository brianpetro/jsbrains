export async function render(scope, opts = {}) {
  const html = Object.entries(scope.settings_config).map(([setting_key, setting_config]) => {
    if (!setting_config.setting) setting_config.setting = setting_key;
    return this.render_setting_html(setting_config);
  }).join('\n');
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, scope, frag, opts);
}

export async function post_process(scope, frag, opts = {}) {
  await this.render_setting_components(frag, {scope});
  return frag;
}