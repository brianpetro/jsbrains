export async function render(turn, data) {
  const turn_container = msg.role === 'system'
    ? this.create_doc_fragment(`<div class="sc-${turn.role}"></div>`)
    : this.create_doc_fragment(`<div class="sc-message ${turn.role}"></div>`)
  ;
  for(const msg of turn.messages) {
    await msg.render(turn_container);
  }
  return post_process(turn, turn_container);
}

export function post_process(turn, frag) {
  return frag;
}