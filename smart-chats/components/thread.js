/**
 * @module components/thread
 * @description Renders a single chat thread with its messages
 */

/**
 * Renders a chat thread
 * @async
 * @param {SmartThread} thread - Thread instance to render
 * @param {Object} [data={}] - Additional data for rendering
 * @param {boolean} [data.show_welcome=true] - Whether to show welcome message for empty threads
 * @returns {DocumentFragment} Rendered thread interface
 */
export async function render(thread, data = {}) {
  const create_welcome_message = () => {
    return [
      this.create_doc_fragment(`
        <div class="sc-message assistant">
          <div class="sc-message-content">
            <span>Hi there, welcome to the Smart Chat. Ask me a question about your notes and I'll try to answer it.</span>
          </div>
        </div>
      `)
    ];
  };
  const message_frags = thread.messages.length
    ? await Promise.all(thread.messages.map(msg => msg.render()))
    : create_welcome_message();

  const main_html = `<div class="sc-message-container"></div>`;
  const container = this.create_doc_fragment(main_html);
  // append each message in the container
  message_frags.forEach(frag => container.querySelector('.sc-message-container').appendChild(frag));
  return post_process(thread, container);
}

/**
 * Post-processes the rendered thread
 * @async
 * @param {SmartThread} thread - Thread instance
 * @param {DocumentFragment} frag - Rendered fragment
 */
export async function post_process(thread, frag) {
  // Implement any post-processing logic here
  return frag;
}
