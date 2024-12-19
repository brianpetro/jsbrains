import {
  process_for_rendering,
  should_render_embed,
  post_process,
} from "smart-entities/components/entity.js";
export async function render(source, opts = {}) {
  let markdown;
  if(should_render_embed(entity)) markdown = entity.embed_link;
  else{
    try{
      markdown = process_for_rendering(await entity.read())
    } catch (e) {
      if(e.message.includes('BLOCK NOT FOUND')){
        markdown = "BLOCK NOT FOUND (run \"Prune\" to remove)";
      } else {
        throw e;
      }
    }
  }
  let frag;
  if(source.env.settings.smart_view_filter.render_markdown) frag = await this.render_markdown(markdown, source);
  else frag = this.create_doc_fragment(`<span>${markdown}</span>`);
  return await post_process.call(this, source, frag, opts);
}

function should_render_embed_source(source) {
  if(should_render_embed(source)) return true;
  if (source.source?.is_canvas || source.source?.is_excalidraw) return true;
  if (source.file_type !== 'md') return true;
  return false;
}