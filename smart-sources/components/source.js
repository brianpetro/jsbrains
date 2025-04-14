import {
  process_for_rendering,
  should_render_embed,
  post_process,
} from "smart-entities/components/entity.js";
export async function render(source, opts = {}) {
  let markdown;
  if(should_render_embed(source)) markdown = source.embed_link;
  else markdown = process_for_rendering(await source.read())
  let frag;
  if(source.env.settings.smart_view_filter.render_markdown) frag = await this.render_markdown(markdown, source);
  else frag = this.create_doc_fragment(`<span>${markdown}</span>`);
  return await post_process.call(this, source, frag, opts);
}