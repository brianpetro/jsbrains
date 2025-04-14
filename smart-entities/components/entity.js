export async function render(entity, opts = {}) {
  let markdown;
  if(should_render_embed(entity)) markdown = `${entity.embed_link}\n\n${await entity.read()}`;
  else markdown = process_for_rendering(await entity.read())
  let frag;
  if(entity.env.settings.smart_view_filter.render_markdown) frag = await this.render_markdown(markdown, entity);
  else frag = this.create_doc_fragment(markdown);
  return await post_process.call(this, entity, frag, opts);
}

export function process_for_rendering(content) {
  // prevent dataview rendering
  if(content.includes('```dataview')) content = content.replace(/```dataview/g, '```\\dataview');
  // prevent link embedding
  if(content.includes('![[')) content = content.replace(/\!\[\[/g, '! [[');
  return content;
}

export async function post_process(scope, frag, opts = {}) {
  return frag;
}    

export function should_render_embed(entity) {
  if (!entity) return false;
  if (entity.is_media) return true;
  return false;
}