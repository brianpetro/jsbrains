export async function render(scope, opts = {}) {
  const markdown = await get_markdown(scope);
  const frag = await this.render_markdown(markdown, scope);
  return post_process.call(this, scope, frag, opts);
}

async function get_markdown(scope) {
  return should_render_embed(scope)
    ? scope.embed_link
    : (await scope.get_content())?.replace(/```dataview/g, '```\\dataview')
  ;
}

export async function post_process(scope, frag, opts = {}) {
  frag.querySelector('.sc-entity').addEventListener('click', (event) => {
    this.handle_entity_click(event, scope);
  });

  return frag;
}    

function should_render_embed(entity) {
  if (!entity) return false;
  if (entity.is_canvas) return true;
  if (entity.is_excalidraw) return true;
  if (entity.source?.is_canvas) return true;
  if (entity.source?.is_excalidraw) return true;
  return false;
}