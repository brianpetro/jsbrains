export async function template(collection, opts = {}) {
  const html = Object.entries(collection.settings_config).map(([setting_key, setting_config]) => {
    if(opts.settings_keys && !opts.settings_keys.includes(setting_key)) return '';
    const attributes = Object.entries(setting_config)
      .map(([attr, value]) => {
        if(typeof value === 'number') return `data-${attr.replace(/_/g, '-')}=${value}`;
        return `data-${attr.replace(/_/g, '-')}="${value}"`;
      })
      .join('\n')
    ;
    return `<div class="setting-component"\ndata-setting="${setting_key}"\n${attributes}\n></div>`;
  }).join('\n');
  const frag = this.create_doc_fragment(html);
  await this.render_setting_components(frag, {scope: collection});
  return frag;
}

export async function post_process(collection, frag, opts = {}) {
}