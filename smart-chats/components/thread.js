/**
 * @module components/thread
 * @description Renders a single chat thread with its messages
 */

/**
 * Builds the HTML string for the thread component
 * @param {SmartThread} thread - Thread instance to render
 * @param {Object} [opts={}] - Optional parameters for customizing the build
 * @returns {string} HTML string for the thread
 */
export function build_html(thread, opts = {}) {
  return `
    <div class="sc-message-container">
      ${opts.show_welcome && !thread.messages.length ? `
        <div class="sc-message assistant">
          <div class="sc-message-content">
            <span>Hi there, welcome to the Smart Chat. Ask me a question about your notes and I'll try to answer it.</span>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Renders a chat thread
 * @async
 * @param {SmartThread} thread - Thread instance to render
 * @param {Object} [opts={}] - Rendering options
 * @param {boolean} [opts.show_welcome=true] - Whether to show welcome message for empty threads
 * @returns {Promise<DocumentFragment>} Rendered thread interface
 */
export async function render(thread, opts = {}) {
  const html = build_html.call(this, thread, {
    show_welcome: opts.show_welcome !== false
  });
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, thread, frag, opts);
}

/**
 * Post-processes the rendered thread
 * @async
 * @param {SmartThread} thread - Thread instance
 * @param {DocumentFragment} frag - Rendered fragment
 * @param {Object} opts - Processing options
 * @returns {Promise<DocumentFragment>} Post-processed fragment
 */
export async function post_process(thread, frag, opts) {
  const container = frag.querySelector('.sc-message-container');
  
  // If we have messages, render them
  if (thread.messages.length) {
    const message_frags = await Promise.all(
      thread.messages.map(msg => msg.render())
    );
    message_frags.forEach(message_frag => {
      container.appendChild(message_frag);
    });
  }
  
  // Scroll to bottom of container if needed
  if (container.scrollHeight > container.clientHeight) {
    container.scrollTop = container.scrollHeight;
  }
  
  return frag;
}
