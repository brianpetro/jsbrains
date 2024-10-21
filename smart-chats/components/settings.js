export async function render(threads_collection, opts = {}) {
  const html = Object.entries(threads_collection.settings_config).map(([setting_name, setting_config]) => {
    const attributes = Object.entries(setting_config)
      .map(([attr, value]) => `data-${attr.replace(/_/g, '-')}="${value}"`)
      .join('\n')
    ;
    return `<div class="setting-component"\ndata-setting="${setting_name}"\n${attributes}\n></div>`;
  }).join('\n');
  const frag = this.create_doc_fragment(html);
  return post_process.call(this, threads_collection, frag, opts);
}

export async function post_process(threads_collection, frag, opts = {}) {
  await this.render_setting_components(frag, { scope: threads_collection });
  return frag;
}
