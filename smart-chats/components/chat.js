import { create_document_fragment } from "./_component.js";
import { render as render_thread } from "./thread.js";

export async function render(thread) {
  const top_bar_buttons = [
    { title: 'Open Conversation Note', icon: 'external-link' },
    { title: 'Chat History', icon: 'history' },
    { title: 'Chat Options', icon: 'sliders-horizontal', style: 'display: none;' },
    { title: 'Chat Settings', icon: 'gear' },
    { title: 'New Chat', icon: 'plus' }
  ].map(btn => `
    <button title="${btn.title}" ${btn.style ? `style="${btn.style}"` : ''}>
      ${this.get_icon(btn.icon)}
    </button>
  `).join('');

  const name = thread ? thread.name : 'Untitled';

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
          <span id="sc-abort-button" style="display: none;">${this.get_icon('square')}</span>
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
  const frag = create_document_fragment(main_html);
  const chat_box = frag.querySelector('.sc-chat-box');

  if (thread) {
    const thread_frag = await render_thread(thread);
    chat_box.appendChild(thread_frag);
  } else {
    const welcome_message = create_document_fragment(`
      <div class="sc-message assistant">
        <div class="sc-message-content">
          <span>Hi there, welcome to the Smart Chat.&nbsp;Ask me a question about your notes and I'll try to answer it.</span>
        </div>
      </div>
    `);
    chat_box.appendChild(welcome_message);
  }

  return post_process(collection, frag);
}

export function post_process(collection, frag) {
  const chat_input = frag.querySelector('.sc-chat-form textarea');
  chat_input.addEventListener('keydown', (e) => {
    collection.key_down_handler(e);
  });
  const abort_button = frag.querySelector('#sc-abort-button');
  abort_button.addEventListener('click', () => {
    collection.chat_model.abort_current_response();
    collection.clear_streaming_ux();
  });
  const send_button = frag.querySelector('#sc-send-button');
  send_button.addEventListener('click', () => {
    collection.handle_send();
  });
  // Left empty for now
  return frag;
}


// HELPER FUNCTIONS
export function create_document_fragment(html) {
  return document.createRange().createContextualFragment(html);
}