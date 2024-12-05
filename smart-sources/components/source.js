import {
  process_for_rendering,
  should_render_embed,
  post_process,
} from "smart-entities/components/entity.js";
export async function render(source, opts = {}) {
  const markdown = should_render_embed_source(source)
    ? source.embed_link
    : process_for_rendering(await source.get_content())
  ;
  let frag;
  if(source.env.settings.smart_view_filter.render_markdown) frag = await this.render_markdown(markdown, source);
  else frag = this.create_doc_fragment(`<span>${markdown}</span>`);
  return await post_process.call(this, source, frag, opts);
}

function should_render_embed_source(source) {
  if(should_render_embed(source)) return true;
  if (entity.source?.is_canvas || entity.source?.is_excalidraw) return true;
  if (source.file_type !== 'md') return true;
  return false;
}