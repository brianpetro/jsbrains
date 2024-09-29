export async function render(collection, opts = {}) {
  const html = Object.entries(collection.settings_config).map(([setting_name, setting_config]) => {
    const attributes = Object.entries(setting_config)
      .map(([attr, value]) => `data-${attr.replace(/_/g, '-')}="${value}"`)
      .join('\n')
      ;
    return `<div class="setting-component"\ndata-setting="${setting_name}"\n${attributes}\n></div>`;
  }).join('\n');
  const frag = this.create_doc_fragment(html);
  await this.render_settings_components(frag);
  return frag;
}

export async function post_process(collection, frag, opts = {}) {
}
