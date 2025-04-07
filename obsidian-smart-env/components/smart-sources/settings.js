import { format_collection_name } from "../../utils/format_collection_name";
export async function build_html(collection, opts={}){
  const settings_html = Object.entries(collection.settings_config).map(([setting_key, setting_config]) => {
    if (!setting_config.setting) setting_config.setting = setting_key;
    return this.render_setting_html(setting_config);
  }).join('\n');
  const html = `<div class="source-settings">
    <h2>${format_collection_name(collection.collection_key)}</h2>
    ${settings_html}
  </div>`;
  return html;
}

export async function render(collection, opts = {}) {
  const html = await build_html.call(this, collection, opts);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, collection, frag, opts);
}

export async function post_process(collection, frag, opts = {}) {
  await this.render_setting_components(frag, {scope: collection});
  
  return frag;
}

