/**
 * @module components/threads
 * @description Renders the main chat interface including threads list, active thread, and input area
 */

/**
 * Builds the HTML string for the threads component
 * @param {SmartThreads} threads_collection - Collection of chat threads
 * @param {Object} [opts={}] - Optional parameters for customizing the build
 * @returns {string} HTML string for the threads interface
 */
export function build_html(threads_collection, opts = {}) {
  const top_bar_buttons = [
    { title: 'Open Conversation Note', icon: 'external-link' },
    { title: 'Chat History', icon: 'history' },
    { title: 'Chat Options', icon: 'sliders-horizontal', style: 'display: none;' },
    { title: 'Chat Settings', icon: 'gear' },
    { title: 'New Chat', icon: 'plus' }
  ].map(btn => `
    <button title="${btn.title}" ${btn.style ? `style="${btn.style}"` : ''}>
      ${this.get_icon_html(btn.icon)}
    </button>
  `).join('');

  const name = threads_collection.current?.name || 'Untitled';

  return `
    <div class="sc-chat-container">
      <div class="sc-top-bar-container">
        <input class="sc-chat-name-input" type="text" value="${name}" placeholder="Chat Name">
        ${top_bar_buttons}
      </div>
      <div id="settings" class="sc-overlay" style="display: none;"></div>
      <div class="sc-thread">
        <!-- Thread messages will be inserted here -->
      </div>
    </div>
    ${opts.attribution || ''}
  `;
}

/**
 * Renders the main chat interface
 * @async
 * @param {SmartThreads} threads_collection - Collection of chat threads
 * @param {Object} [opts={}] - Rendering options
 * @param {boolean} [opts.show_settings=false] - Whether to show settings panel
 * @param {boolean} [opts.show_threads=true] - Whether to show threads list
 * @returns {Promise<DocumentFragment>} Rendered chat interface
 */
export async function render(threads_collection, opts = {}) {
  const html = build_html.call(this, threads_collection, opts);
  const frag = this.create_doc_fragment(html);
  return await post_process.call(this, threads_collection, frag, opts);
}

/**
 * Post-processes the rendered chat interface
 * @async
 * @param {SmartThreads} threads_collection - Collection of chat threads
 * @param {DocumentFragment} frag - Rendered fragment
 * @param {Object} opts - Processing options
 * @returns {Promise<DocumentFragment>} Post-processed fragment
 */
export async function post_process(threads_collection, frag, opts) {
  const chat_box = frag.querySelector('.sc-thread');
  
  // Initialize thread if needed
  let thread = threads_collection.get_active_thread();
  if (!thread) {
    thread = await threads_collection.create_or_update({});
    chat_box.setAttribute('data-thread-key', thread.key);
  }
  await thread.render(chat_box, opts);

  // Setup button handlers
  setup_button_handlers.call(this, frag, threads_collection);
  
  return frag;
}

/**
 * Sets up button click handlers
 * @private
 */
function setup_button_handlers(frag, threads_collection) {

  // Settings button
  const settings_button = frag.querySelector('button[title="Chat Settings"]');
  const overlay_container = frag.querySelector(".sc-overlay");
  settings_button.addEventListener('click', () => {
    if (overlay_container.style.display === 'none') {
      threads_collection.render_settings(overlay_container);
      overlay_container.style.display = 'block';
    } else {
      overlay_container.style.display = 'none';
    }
  });

  // New chat button
  const new_chat_button = frag.querySelector('button[title="New Chat"]');
  new_chat_button.addEventListener('click', async () => {
    threads_collection.container.innerHTML = '';
    threads_collection.render();
  });
}