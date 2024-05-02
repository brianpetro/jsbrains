const { message_content_array_to_markdown } = require("../smart-chats/utils/message_content_array_to_markdown");
/**
 * Represents the user interface for SmartChat.
 * This class handles the rendering and interaction logic for the chat interface.
 */
class SmartChatsUI {
  /**
   * Creates an instance of SmartChatsUI.
   * @param {Object} env - The environment object containing configurations and utilities.
   * @param {HTMLElement} container - The HTML container element for the chat UI.
   */
  constructor(env, container) {
    this.env = env;
    this.main = this.env; // DEPRECATED
    this.container = container;
    this.templates = this.env.templates;
  }

  /**
   * Provides a context for the view rendering. Should be overridden in subclasses.
   * @returns {Object} The context object for the view.
   */
  get view_context() { return { /* override */ }; }

  /**
   * Renders templates using the environment's rendering engine.
   * @param {...any} args - Arguments including template and data to render.
   * @returns {Promise<string>} The rendered HTML string.
   */
  async render(...args) { return await this.env.ejs.render(...args); }

  /**
   * Displays a notice message in the console.
   * @param {string} message - The message to display.
   */
  show_notice(message) { console.log(message); }

  /**
   * Initializes the chat UI by clearing the container and rendering the initial chat template.
   */
  async init() {
    console.log("init SmartChatRenderer");
    console.log(this.container);
    this.container.innerHTML = "";
    console.log(this.env.chats.current);
    const data = await this.get_view_data();
    this.container.innerHTML = await this.render(this.templates.smart_chat, data, { context: this.view_context, rmWhitespace: true });
    this.post_process();
  }

  /**
   * Handles new user messages, updates the UI, and triggers rendering of typing indicator.
   * @param {string} user_input - The user's input message.
   */
  async new_user_message(user_input) {
    await this.new_message(user_input, "user");
    this.set_streaming_ux();
    await this.render_dotdotdot();
  }

  /**
   * Post-initialization processing, such as adding listeners and processing messages.
   */
  async post_process() {
    this.add_listeners();
    this.messages.forEach(this.message_post_process.bind(this));
  }

  /**
   * Placeholder for adding listeners. Should be overridden in subclasses.
   */
  add_listeners() { }

  /**
   * Placeholder for message post-processing. Should be overridden in subclasses.
   * @param {HTMLElement} msg_elm - The message element to process.
   */
  message_post_process(msg_elm) { }

  /**
   * Retrieves view data for rendering the chat interface.
   * @returns {Promise<Object>} An object containing data for the view.
   */
  add_message_listeners(msg_elm) { } // OVERRIDE
  async get_view_data() {
    const data = {
      name: this.env.chats.current?.name || "UNTITLED CHAT",
      messages: await this.env.chats.current.get_messages_html(),
    };
    return data;
  }

  /**
   * Adds input listeners to the chat form for handling special keys and sending messages.
   */
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
      if(!this.last_msg) this.message_container.insertAdjacentHTML("beforeend", await this.get_message_html(role, content));
      clearInterval(this.dotdotdot_interval);
      this.dotdotdot_interval = null;
      this.last_msg_content.innerHTML = ''; // clear last message
      this.last_msg.dataset.content = "";
    }
    if(this.last_msg && !this.last_msg.dataset.content) this.last_msg.dataset.content = "";
    if (append_last) {
      this.last_msg_content.innerHTML += content;
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
        this.last_msg.dataset.content = content;
      }
      this.message_post_process(this.last_msg);
    }
    this.message_container.scrollTop = this.message_container.scrollHeight;
  }

  /**
   * Generates HTML for a message based on the role and content.
   * @param {string} role - The role of the message sender.
   * @param {string} content - The content of the message.
   * @returns {Promise<string>} The HTML string for the message.
   */
  async get_message_html(role, content) {
    if(Array.isArray(content)) content = message_content_array_to_markdown(content);
    return await this.render(this.templates.smart_chat_msg, { role, content }, { context: this.view_context, rmWhitespace: true });
  }

  async get_system_message_html(msg) {
    let { content, role } = msg;
    if(content.includes('```sc-system')) {
      content = content.replace(/```sc-system|```/g, "").trim();
      content = "system prompts: " + content.split('\n').filter(ln => ln.trim()).join(', ');
    }
    if(content.includes('```sc-context')) {
      content = content.replace(/```sc-context|```/g, "").trim();
      content = "context: " + content.split('\n').filter(ln => ln.trim()).join(', ');
      if(content.length > 100) content = content.substring(0, 100) + "...";
    }
    return await this.render(this.templates.smart_chat_system_msg, { content, role }, { context: this.view_context, rmWhitespace: true });
  }

  /**
   * Inserts selected text from a suggestion modal into the chat input.
   * @param {string} insert_text - The text to insert.
   */
  insert_selection(insert_text) {
    const textarea = this.container.querySelector(".sc-chat-form textarea");
    let caret_pos = textarea.selectionStart;
    let text_before = textarea.value.substring(0, caret_pos);
    let text_after = textarea.value.substring(caret_pos, textarea.value.length);
    textarea.value = text_before + insert_text + text_after;
    textarea.selectionStart = caret_pos + insert_text.length;
    textarea.selectionEnd = caret_pos + insert_text.length;
    textarea.focus();
  }

  /**
   * Renders a typing indicator ("...") and sets an interval to animate it.
   */
  async render_dotdotdot() {
    if (this.dotdotdot_interval) clearInterval(this.dotdotdot_interval);
    await this.new_message("...", "assistant");
    let dots = 0;
    const curr_msg = this.last_msg_content;
    curr_msg.innerHTML = '...';
    this.dotdotdot_interval = setInterval(() => {
      dots++;
      if (dots > 3) dots = 1;
      curr_msg.innerHTML = '.'.repeat(dots);
    }, 500);
  }

  /**
   * Returns the message container element.
   * @returns {HTMLElement} The message container.
   */
  get message_container() { return this.container.querySelector(".sc-message-container"); }

  /**
   * Returns the last message content element.
   * @returns {HTMLElement} The last message content element.
   */
  get last_msg() { return this.container.querySelector(".sc-message-container").lastElementChild.querySelector(".sc-message-content"); }

  /**
   * Returns the last message content span element.
   * @returns {HTMLElement} The last message content span element.
   */
  get last_msg_content() { return this.last_msg.querySelector("span:not(.sc-msg-button)"); }

  /**
   * Returns all message content elements.
   * @returns {NodeListOf<HTMLElement>} A NodeList of message content elements.
   */
  get messages() { return this.container.querySelectorAll(".sc-message-container .sc-message-content"); }

  /**
   * Sets the user interface to a "streaming" mode, disabling input and showing an abort button.
   */
  set_streaming_ux() {
    this.prevent_input = true;
    // hide send button
    if (this.container.querySelector("#sc-send-button"))
      this.container.querySelector("#sc-send-button").style.display = "none";
    // show abort button
    if (this.container.querySelector("#sc-abort-button"))
      this.container.querySelector("#sc-abort-button").style.display = "block";
  }

  /**
   * Resets the user interface from "streaming" mode to normal.
   */
  unset_streaming_ux() {
    this.prevent_input = false;
    // show send button, remove display none
    if (this.container.querySelector("#sc-send-button"))
      this.container.querySelector("#sc-send-button").style.display = "";
    // hide abort button
    if (this.container.querySelector("#sc-abort-button"))
      this.container.querySelector("#sc-abort-button").style.display = "none";
  }

  /**
   * Clears any streaming user interface effects, such as intervals and temporary elements.
   */
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
exports.SmartChatsUI = SmartChatsUI;