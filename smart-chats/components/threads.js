export async function render(threads = null, opts = {}) {
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

  const name = threads.current?.name || 'Untitled';

  const main_html = `
    <div class="sc-chat-container">
      <div class="sc-top-bar-container">
        <input class="sc-chat-name-input" type="text" value="${name}" placeholder="Chat Name">
        ${top_bar_buttons}
      </div>
      <div id="settings" class="sc-overlay"></div>
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

  if (!threads.current) {
    threads.current = await threads.create_or_update({});
  }
  await threads.current.render(chat_box);

  return post_process.call(this, threads, frag, opts);
}

export function post_process(threads, frag, opts = {}) {
  const chat_input = frag.querySelector('.sc-chat-form textarea');
  chat_input.addEventListener('keydown', (e) => {
    const handler_resp = opts.key_down_handler ? opts.key_down_handler(e) : null;
    if(handler_resp === 'send'){ 
      threads.current.new_user_message(chat_input.value);
      chat_input.value = '';
    }
  });

  const abort_button = frag.querySelector('#sc-abort-button');
  abort_button.addEventListener('click', () => {
    threads.current.chat_model.abort_current_response();
    threads.current.clear_streaming_ux();
  });

  const send_button = frag.querySelector('#sc-send-button');
  send_button.addEventListener('click', () => {
    threads.current.new_user_message(chat_input.value);
    chat_input.value = '';
  });

  // settings button
  const settings_button = frag.querySelector('button[title="Chat Settings"]');
  const overlay_container = frag.querySelector(".sc-overlay");
  settings_button.addEventListener('click', () => {
    threads.render_settings(overlay_container);
  });

  // new chat button
  const new_chat_button = frag.querySelector('button[title="New Chat"]');
  new_chat_button.addEventListener('click', () => {
    threads.current = null
    threads.render();
  });
  
  // refocus chat input
  chat_input.focus();

  return frag;
}