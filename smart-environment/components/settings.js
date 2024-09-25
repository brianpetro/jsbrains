export async function template(env, opts = {}) {
  const frag = this.create_doc_fragment(opts.html || '<div></div>');
  await this.render_setting_components(frag);
  for(const collection_key of Object.keys(env.collections)){
    const collection = env[collection_key];
    let container = frag.querySelector("#" + collection_key + "_settings");
    const render_opts = {};
    if(container){
      // if container has settings_keys data attribute, use it
      const settings_keys = container.dataset.settingsKeys;
      if(settings_keys){
        render_opts.settings_keys = settings_keys.split(',');
      }
    }
    if(!container){
      container = this.create_doc_fragment('<div></div>');
      container.id = collection_key + "_settings";
      frag.appendChild(container);
    }
    await collection.render_settings(container, render_opts);
  }
  await this.render_setting_components(frag, {scope: env});
  return frag;
}

export async function post_process(collection, frag, opts = {}) {
}


