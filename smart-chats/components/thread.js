export async function render(thread, data) {
  const create_welcome_message = () => {
    return this.create_doc_fragment(`
      <div class="sc-message assistant">
        <div class="sc-message-content">
          <span>Hi there, welcome to the Smart Chat.&nbsp;Ask me a question about your notes and I'll try to answer it.</span>
        </div>
      </div>`);
  };
  const turn_frags = thread
    ? await thread.render_turns()
    : create_welcome_message();

  const main_html = `<div class="sc-message-container"></div>`;
  const container = this.create_doc_fragment(main_html);
  // append each turn in the container
  turn_frags.forEach(frag => container.querySelector('.sc-message-container').appendChild(frag));
  return post_process(thread, container);
}


export function post_process(thread, frag) {
  // Implement any post-processing logic here
  return frag;
}