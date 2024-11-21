/**
 * @module components/message
 * @description Renders individual chat messages with support for various content types
 */

/**
 * Builds the HTML string for the message component
 * @param {SmartMessage} message - Message instance to render
 * @param {Object} [opts={}] - Optional parameters for customizing the build
 * @returns {string} HTML string for the message
 */
export function build_html(message, opts = {}) {
  if (message.data.role === 'system') {
    return `
      <div class="sc-message system" data-content="${message.content}">
        <span>${message.content}</span>
      </div>
    `;
  }
  
  return `
    <div class="sc-message ${message.data.role}" id="${message.data.id}">
      <div class="sc-message-content" data-content="${message.content}">
        <span>${message.content}</span>
        <span class="sc-msg-button" title="Copy message to clipboard">${this.get_icon_html('copy')}</span>
      </div>
    </div>
  `;
}

/**
 * Renders a chat message
 * @async
 * @param {SmartMessage} message - Message instance to render
 * @param {Object} [opts={}] - Rendering options
 * @param {boolean} [opts.show_role=true] - Whether to show message role
 * @param {boolean} [opts.show_timestamp=true] - Whether to show message timestamp
 * @returns {Promise<DocumentFragment>} Rendered message interface
 */
export async function render(message, opts = {}) {
  const html = build_html.call(this, message, opts);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, message, frag, opts);
}

/**
 * Post-processes the rendered message
 * @async
 * @param {SmartMessage} message - Message instance
 * @param {DocumentFragment} frag - Rendered fragment
 * @param {Object} opts - Processing options
 * @returns {Promise<DocumentFragment>} Post-processed fragment
 */
export async function post_process(message, frag, opts) {
  const copy_button = frag.querySelector('.sc-msg-button');
  if (copy_button) {
    copy_button.addEventListener('click', () => {
      navigator.clipboard.writeText(message.content)
        .then(() => {
          // Optionally, provide user feedback for successful copy
          console.log('Message copied to clipboard');
        })
        .catch(err => {
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

/**
 * Processes markdown content in messages
 * @private
 * @param {string} content - Raw markdown content
 * @returns {string} Processed HTML content
 */
function process_markdown(content) {
  // ... implementation
}
