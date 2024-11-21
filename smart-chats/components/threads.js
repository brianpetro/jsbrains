/**
 * @module components/threads
 * @description Renders the main chat interface including threads list, active thread, and input area
 */

/**
 * Renders the main chat interface
 * @async
 * @param {SmartThreads} threads_collection - Collection of chat threads
 * @param {Object} [opts={}] - Rendering options
 * @param {boolean} [opts.show_settings=false] - Whether to show settings panel
 * @param {boolean} [opts.show_threads=true] - Whether to show threads list
 * @returns {DocumentFragment} Rendered chat interface
 */
export async function render(threads_collection, opts = {}) {
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

  const main_html = `
    <div class="sc-chat-container">
      <div class="sc-top-bar-container">
        <input class="sc-chat-name-input" type="text" value="${name}" placeholder="Chat Name">
        ${top_bar_buttons}
      </div>
      <div id="settings" class="sc-overlay" style="display: none;"></div>
      <div class="sc-chat-box">
        <!-- Thread messages will be inserted here -->
      </div>
      <div class="sc-chat-form">
        <textarea class="sc-chat-input" placeholder="Try &quot;Based on my notes&quot; or &quot;Summarize [[this note]]&quot; or &quot;Important tasks in /folder/&quot;"></textarea>
        <div class="sc-btn-container">
          <span id="sc-abort-button" style="display: none;">${this.get_icon_html('square')}</span>
          <button class="send-button" id="sc-send-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 32 32">
              <circle cx="16" cy="16" r="16" fill="currentColor" />
              <path fill="currentColor" fill-rule="evenodd" d="M15.192 8.906a1.143 1.143 0 0 1 1.616 0l5.143 5.143a1.143 1.143 0 0 1-1.616 1.616l-3.192-3.192v9.813a1.143 1.143 0 0 1-2.286 0v-9.813l-3.192 3.192a1.143 1.143 0 1 1-1.616-1.616z" clip-rule="evenodd" fill="#727272"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
      ${opts.attribution || ''}
  `;
  const frag = this.create_doc_fragment(main_html);
  const chat_box = frag.querySelector('.sc-chat-box');

  if (!threads_collection.current) {
    threads_collection.current = await threads_collection.create_or_update({});
  }
  await threads_collection.current.render(chat_box);

  return post_process.call(this, threads_collection, frag, opts);
}

/**
 * Post-processes the rendered chat interface
 * @async
 * @param {SmartThreads} threads_collection - Collection of chat threads
 * @param {DocumentFragment} frag - Rendered fragment
 * @param {Object} opts - Processing options
 */
export async function post_process(threads_collection, frag, opts) {
  const chat_input = frag.querySelector('.sc-chat-form textarea');
  chat_input.addEventListener('keydown', (e) => {
    const mod = this.adapter.is_mod_event(e); // properly handle if the meta/ctrl key is pressed
    if (e.key === "Enter" && mod) {
      e.preventDefault();
      threads_collection.current.new_user_message(chat_input.value);
      chat_input.value = '';
    }
    // console.log("key", e.key);
    if(!["/", "@", "["].includes(e.key)) return;
    // get cursor position
    const pos = chat_input.selectionStart;
    // if key is open square bracket
    if (e.key === "[") {
      if(!opts.open_file_suggestion_modal) return;
      // if previous char is [
      if (chat_input.value[pos - 1] === "[") {
        // open file suggestion modal (timeout so that last key is added to input)
        setTimeout(() => { opts.open_file_suggestion_modal() }, 10);
        return;
      }
    } else {
      this.brackets_ct = 0;
    }
    // if / is pressed
    if (e.key === "/") {
      if(!opts.open_folder_suggestion_modal) return;
      // if this is first char or previous char is space (timeout so that last key is added to input)
      if (chat_input.value.length === 0 || [" ", "\n"].includes(chat_input.value[pos - 1])) {
        // open folder suggestion modal (timeout so that last key is added to input)
        setTimeout(() => { opts.open_folder_suggestion_modal() }, 10);
        return;
      }
    }
    // if @ is pressed
    if (e.key === "@") {
      if(!opts.open_system_prompt_modal) return;
      // if this is first char or previous char is space
      if (chat_input.value.length === 0 || [" ", "\n"].includes(chat_input.value[pos - 1])) {
        // open system prompt suggestion modal (timeout so that last key is added to input)
        setTimeout(() => { opts.open_system_prompt_modal() }, 10);
        return;
      }
    }
  });

  // key up handlers
  chat_input.addEventListener('keyup', (e) => {
    clearTimeout(this.resize_debounce);
    this.resize_debounce = setTimeout(() => {
      chat_input.style.height = 'auto';
      chat_input.style.height = `${chat_input.scrollHeight}px`;
    }, 200);
  });

  const abort_button = frag.querySelector('#sc-abort-button');
  abort_button.addEventListener('click', () => {
    threads_collection.current.chat_model.abort_current_response();
    threads_collection.current.clear_streaming_ux();
  });

  const send_button = frag.querySelector('#sc-send-button');
  send_button.addEventListener('click', () => {
    threads_collection.current.new_user_message(chat_input.value);
    chat_input.value = '';
  });

  // settings button
  const settings_button = frag.querySelector('button[title="Chat Settings"]');
  const overlay_container = frag.querySelector(".sc-overlay");
  settings_button.addEventListener('click', (e) => {
    if(overlay_container.style.display === 'none') {
      threads_collection.render_settings(overlay_container);
      overlay_container.style.display = 'block';
    } else {
      overlay_container.style.display = 'none';
    }
  });

  // new chat button
  const new_chat_button = frag.querySelector('button[title="New Chat"]');
  new_chat_button.addEventListener('click', () => {
    threads_collection.current = null
    threads_collection.render();
  });
  
  // refocus chat input
  chat_input.focus();

  return frag;
}