class SmartChatUI {
  constructor(env, container) {
    this.env = env;
    this.main = this.env; // DEPRECATED
    this.container = container;
    this.templates = this.env.templates;
  }
  get view_context() { return { /* override */ }; }
  // calls this.env.render with same arguments
  async render(...args) { return await this.env.ejs.render(...args); }
  // well-formed (architectural) methods
  show_notice(message) { console.log(message); }
  async init() {
    console.log("init SmartChatRenderer");
    console.log(this.container);
    // clear container
    this.container.innerHTML = "";
    console.log(this.env.chats.current);
    const data = await this.get_view_data();
    this.container.innerHTML = await this.render(this.templates.smart_chat, data, { context: this.view_context, rmWhitespace: true });
    this.post_process();
  }
  async new_user_message(user_input) {
    await this.new_message(user_input, "user");
    this.set_streaming_ux();
    await this.render_dotdotdot();
  }
  async post_process() {
    this.add_listeners();
    this.messages.forEach(this.message_post_process.bind(this));
  }
  add_listeners() { } // OVERRIDE
  message_post_process(msg_elm) { } // OVERRIDE
  add_message_listeners(msg_elm) { } // OVERRIDE
  async get_view_data() {
    const data = {
      name: this.env.chats.current?.name || "UNTITLED CHAT",
      messages: await this.env.chats.current.get_messages_html(),
    };
    return data;
  }
  add_chat_input_listeners() {
    const chat_input = this.container.querySelector(".sc-chat-form");
    const textarea = chat_input.querySelector("textarea");
    this.brackets_ct = 0;
    this.prevent_input = false;
    chat_input.addEventListener("keyup", (e) => {
      if (["[", "/", "@"].indexOf(e.key) === -1) return; // skip if key is not [ or / or @
      const caret_pos = textarea.selectionStart;
      // if key is open square bracket
      if (e.key === "[") {
        // if previous char is [
        if (textarea.value[caret_pos - 2] === "[") {
          // open file suggestion modal
          this.open_file_suggestion_modal();
          return;
        }
      } else {
        this.brackets_ct = 0;
      }
      // if / is pressed
      if (e.key === "/") {
        // get caret position
        // if this is first char or previous char is space
        if (textarea.value.length === 1 || textarea.value[caret_pos - 2] === " ") {
          // open folder suggestion modal
          this.open_folder_suggestion_modal();
          return;
        }
      }
      // if @ is pressed
      if (e.key === "@") {
        // console.log("caret_pos", caret_pos);
        // get caret position
        // if this is first char or previous char is space
        if (textarea.value.length === 1 || textarea.value[caret_pos - 2] === " ") {
          // open system prompt suggestion modal
          this.open_system_prompt_modal();
          return;
        }
      }

    });
    chat_input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        if (this.prevent_input) {
          this.show_notice("Wait until current response is finished.");
          return;
        }
        // get text from textarea
        let user_input = textarea.value;
        // clear textarea
        textarea.value = "";
        // initiate response from assistant
        this.env.chats.current.new_user_message(user_input);
      }
      textarea.style.height = 'auto';
      textarea.style.height = (textarea.scrollHeight) + 'px';
    });
    const abort_button = this.container.querySelector("#sc-abort-button");
    abort_button.addEventListener("click", () => {
      // abort current response
      this.env.chat_model.stop_stream();
    });
    const button = this.container.querySelector("#sc-send-button");
    // add event listener to button
    button.addEventListener("click", () => {
      if (this.prevent_input) {
        this.show_notice("Wait until current response is finished.");
        return;
      }
      // get text from textarea
      let user_input = textarea.value;
      // clear textarea
      textarea.value = "";
      // initiate response from assistant
      this.env.chats.current.new_user_message(user_input);
    });
  }
  // render message
  async new_message(content, role = "assistant", append_last = false) {
    // if dotdotdot interval is set, then clear it
    if (this.dotdotdot_interval) {
      clearInterval(this.dotdotdot_interval);
      this.dotdotdot_interval = null;
      this.last_msg_content.innerHTML = ''; // clear last message
      this.last_msg.dataset.content = "";
    }
    if(!this.last_msg.dataset.content) this.last_msg.dataset.content = "";
    if (append_last) {
      this.last_msg_content.innerHTML += content;
      // addpend to data-content
      this.last_msg.dataset.content += content;
      if (content.indexOf('\n') > -1) this.render_md_as_html(this.last_msg);
    } else {
      if (this.last_from !== role) {
        const html = await this.get_message_html(role, content);
        this.message_container.insertAdjacentHTML("beforeend", html); // append html to this.message_container while preserving other elements in this.message_container.
        this.last_from = role; // set last from
        this.last_msg.dataset.content = content;
      } else {
        this.last_msg_content.innerHTML = content;
        // addpend to data-content
        this.last_msg.dataset.content = content;
      }
      this.message_post_process(this.last_msg);
    }
    // scroll to bottom
    this.message_container.scrollTop = this.message_container.scrollHeight;
  }
  async get_message_html(role, content) { return await this.render(this.templates.smart_chat_msg, { role, content }, { context: this.view_context, rmWhitespace: true }); }

  // insert_selection from file suggestion modal
  insert_selection(insert_text) {
    const textarea = this.container.querySelector(".sc-chat-form textarea");
    // get caret position
    let caret_pos = textarea.selectionStart;
    // get text before caret
    let text_before = textarea.value.substring(0, caret_pos);
    // get text after caret
    let text_after = textarea.value.substring(caret_pos, textarea.value.length);
    // insert text
    textarea.value = text_before + insert_text + text_after;
    // set caret position
    textarea.selectionStart = caret_pos + insert_text.length;
    textarea.selectionEnd = caret_pos + insert_text.length;
    // focus on textarea
    textarea.focus();
  }
  async render_dotdotdot() {
    if (this.dotdotdot_interval) clearInterval(this.dotdotdot_interval);
    await this.new_message("...", "assistant");
    // if is '...', then initiate interval to change to '.' and then to '..' and then to '...'
    let dots = 0;
    // get last .sc-message > .sc-message-content in sc-message-container
    const curr_msg = this.last_msg_content;
    curr_msg.innerHTML = '...';
    this.dotdotdot_interval = setInterval(() => {
      dots++;
      if (dots > 3)
        dots = 1;
      curr_msg.innerHTML = '.'.repeat(dots);
    }, 500);
    // wait 2 seconds for testing
    // await new Promise(r => setTimeout(r, 2000));
  }
  get message_container() { return this.container.querySelector(".sc-message-container"); }
  get last_msg() { return this.container.querySelector(".sc-message-container").lastElementChild.querySelector(".sc-message-content"); }
  get last_msg_content() { return this.last_msg.querySelector("span:not(.sc-msg-button)"); }
  get messages() { return this.container.querySelectorAll(".sc-message-container .sc-message-content"); }

  // TODO: REVIEW
  set_streaming_ux() {
    this.prevent_input = true;
    // hide send button
    if (this.container.querySelector("#sc-send-button"))
      this.container.querySelector("#sc-send-button").style.display = "none";
    // show abort button
    if (this.container.querySelector("#sc-abort-button"))
      this.container.querySelector("#sc-abort-button").style.display = "block";
  }
  unset_streaming_ux() {
    this.prevent_input = false;
    // show send button, remove display none
    if (this.container.querySelector("#sc-send-button"))
      this.container.querySelector("#sc-send-button").style.display = "";
    // hide abort button
    if (this.container.querySelector("#sc-abort-button"))
      this.container.querySelector("#sc-abort-button").style.display = "none";
  }
  clear_streaming_ux() {
    this.unset_streaming_ux();
    if (this.dotdotdot_interval) {
      clearInterval(this.dotdotdot_interval);
      this.dotdotdot_interval = null;
      // remove parent of active_elm
      this.active_elm.parentElement.remove();
      this.active_elm = null;
    }
  }
}
exports.SmartChatUI = SmartChatUI;
