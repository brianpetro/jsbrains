import { create_document_fragment } from "./_component.js";
export async function template(collection, opts = {}) {
  const smart_settings = new collection.env.smart_chat_plugin.smart_settings_class(collection.env, {
    smart_setting_class: collection.env.smart_chat_plugin.smart_setting_class, // These setting classes should be moved to env.opts
    rel_instance: collection,
    re_render: collection.render_settings.bind(collection),
  });
  const html = Object.entries(collection.settings_config).map(([setting_name, setting_config]) => {
    const attributes = Object.entries(setting_config)
      .map(([attr, value]) => `data-${attr.replace(/_/g, '-')}="${value}"`)
      .join('\n')
      ;
    return `<div class="setting-component"\ndata-setting="${setting_name}"\n${attributes}\n></div>`;
  }).join('\n');
  const frag = create_document_fragment(html);
  await smart_settings.render_components(frag);
  return frag;
}

export async function post_process(collection, frag, opts = {}) {
}
