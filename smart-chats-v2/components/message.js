import { create_document_fragment } from "./_component.js";

export async function template(message, opts={}) {
  const frag = message.turn.role === 'system' ? create_system_message_frag(message) : create_participant_message_frag(message);
  return post_process(message, frag);
}
export function post_process(message, frag) {
  return frag;
}

function create_system_message_frag(message) {
  const frag = create_document_fragment(`
    <div data-content="${message.content}">
      <span>${message.content}</span>
    </div>
  `);
  return frag;
}
function create_participant_message_frag(message) {
  const frag = create_document_fragment(`
    <div class="sc-message-content" data-content="${message.content}">
      <span>${message.content}</span>
      <span class="sc-msg-button" title="Copy message to clipboard">${this.get_icon('copy')}</span>
    </div>
  `);
  return frag;
}