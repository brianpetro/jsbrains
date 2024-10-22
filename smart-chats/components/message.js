export async function render(message, opts={}) {
  const create_system_message_frag = (message) => {
    const frag = this.create_doc_fragment(`
      <div class="sc-message system" data-content="${message.content}">
        <span>${message.content}</span>
      </div>
    `);
    return frag;
  };
  const create_participant_message_frag = (message) => {
    const frag = this.create_doc_fragment(`
      <div class="sc-message ${message.data.role}">
        <div class="sc-message-content" data-content="${message.content}">
          <span>${message.content}</span>
          <span class="sc-msg-button" title="Copy message to clipboard">${this.get_icon_html('copy')}</span>
        </div>
      </div>
    `);
    return frag;
  }
  const frag = message.data.role === 'system' ? create_system_message_frag(message) : create_participant_message_frag(message);
  return await post_process.call(this, message, frag);
}

export async function post_process(message, frag) {
  const copy_button = frag.querySelector('.sc-msg-button');
  if (copy_button) {
    copy_button.addEventListener('click', () => {
      navigator.clipboard.writeText(message.content).then(() => {
        // Optionally, provide user feedback for successful copy
        console.log('Message copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy message: ', err);
      });
    });
  }
  const msg_span = frag.querySelector('span');
  const markdown_rendered_frag = await this.render_markdown(msg_span.textContent, message);
  msg_span.innerHTML = '';
  msg_span.appendChild(markdown_rendered_frag);
  return frag;
}
