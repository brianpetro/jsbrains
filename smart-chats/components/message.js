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
  const content = Array.isArray(message.content) 
    ? message.content.map(part => {
        if (part.type === "image_url") {
          return `<img src="${part.image_url.url}" alt="Chat image" class="sc-message-image"/>`;
        }
        if(part.type === 'text' && part.text?.length) return part.text;
      }).join('\n')
    : message.content;

  // Get branches for this message
  const branches = message.thread.get_branches(message.msg_i);
  const has_branches = branches && branches.length > 0;

  return `
    <div class="sc-message ${message.role}" id="${message.data.id}">
      <div class="sc-message-content" data-content="${encodeURIComponent(content)}">
        <span>${content}</span>
        <div class="sc-msg-buttons">
          <span class="sc-msg-button" title="Copy message to clipboard">${this.get_icon_html('copy')}</span>
          ${message.role === 'assistant' ? `
            <span class="sc-msg-button regenerate" title="Regenerate response">${this.get_icon_html('refresh-cw')}</span>
            ${has_branches ? `
              <span class="sc-msg-button cycle-branch" title="Cycle through response variations">${message.branch_i}/${branches.length + 1} ${this.get_icon_html('chevron-right')}</span>
            ` : ''}
          ` : ''}
        </div>
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
  const copy_button = frag.querySelector('.sc-msg-button:not(.regenerate)');
  if (copy_button) {
    copy_button.addEventListener('click', () => {
      navigator.clipboard.writeText(message.content)
        .then(() => {
          console.log('Message copied to clipboard');
        })
        .catch(err => {
          console.error('Failed to copy message: ', err);
        });
    });
  }

  const regenerate_button = frag.querySelector('.sc-msg-button.regenerate');
  if (regenerate_button) {
    regenerate_button.addEventListener('click', async () => {
      const thread = message.thread;
      const msg_i = thread.data.messages[message.data.id];
      
      // Move current message and subsequent messages to branches
      if (!thread.data.branches) thread.data.branches = {};
      if (!thread.data.branches[msg_i]) thread.data.branches[msg_i] = [];
      
      const branch_messages = {};
      Object.entries(thread.data.messages)
        .filter(([_, i]) => i >= msg_i)
        .forEach(([key, i]) => {
          branch_messages[key] = i;
          delete thread.data.messages[key];
        });
      
      thread.data.branches[msg_i].push(branch_messages);

      await thread.render();
      
      // Trigger regeneration
      await thread.complete();
    });
  }

  const cycle_branch_button = frag.querySelector('.sc-msg-button.cycle-branch');
  if (cycle_branch_button) {
    cycle_branch_button.addEventListener('click', async () => {
      await message.thread.cycle_branch(message.msg_i);
    });
  }

  const msg_span = frag.querySelector('.sc-message-content > span:first-child');
  if (Array.isArray(message.content)) {
    msg_span.innerHTML = message.content.map(part => {
      if (part.type === "image_url") {
        return `<img src="${part.image_url.url}" alt="Chat image" class="sc-message-image"/>`;
      }
      if(part.type === 'text' && part.text?.length) return this.render_markdown(part.text);
    }).join('\n');
  } else {
    const markdown_rendered_frag = await this.render_markdown(msg_span.textContent, message);
    msg_span.innerHTML = '';
    msg_span.appendChild(markdown_rendered_frag);
  }
  
  return frag;
}

// for testing
function get_html_from_fragment(fragment) {
    const temp_container = document.createElement('div');
    temp_container.appendChild(fragment.cloneNode(true));
    return temp_container.innerHTML;
}