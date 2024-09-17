export async function template(env, opts = {}) {
  console.log('this', this);
  const frag = this.create_doc_fragment(opts.html || '<div></div>');
  await this.render_setting_components(frag);
  for(const collection_key of Object.keys(env.collections)){
    const collection = env[collection_key];
    let container = frag.querySelector("#" + collection_key + "_settings");
    if(!container){
      container = this.create_doc_fragment('<div></div>');
      container.id = collection_key + "_settings";
      frag.appendChild(container);
    }
    await collection.render_settings(container);
  }
  await this.render_setting_components(frag);
  return frag;
}

export async function post_process(collection, frag, opts = {}) {
}


