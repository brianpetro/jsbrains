import { create_document_fragment } from "./_component.js";
export async function template(turn, data) {
  const turn_container = msg.role === 'system' ? create_system_turn_frag(turn) : create_participant_turn_frag(turn);
  for(const msg of turn.messages) {
    await msg.render(turn_container);
  }
  return post_process(turn, turn_container);
}

function create_system_turn_frag(turn) {
  return create_document_fragment(`<div class="sc-${turn.role}"></div>`);
}
function create_participant_turn_frag(turn) {
  return create_document_fragment(`<div class="sc-message ${turn.role}"></div>`);
}

export function post_process(turn, frag) {
  return frag;
}