import { SmartSource } from "smart-sources";
import { render as thread_template } from "./components/thread.js";
import { contains_folder_reference, extract_folder_references } from "./utils/folder_references";
import { contains_internal_link, extract_internal_links } from "./utils/internal_links";
import { contains_self_referential_keywords } from "./utils/self_referential_keywords";
import { contains_system_prompt_ref, extract_system_prompt_ref } from "./utils/system_prompts";
import { contains_markdown_image, extract_markdown_images } from "./utils/markdown_images";
import { render as error_template } from "./components/error.js";
/**
 * @class SmartThread
 * @extends SmartSource
 * @description Represents a single chat thread. Manages message history, handles user interactions,
 * coordinates with AI models, and maintains thread state. Supports real-time UI updates and
 * message context management.
 */
export class SmartThread extends SmartSource {
  /**
   * @static
   * @property {Object} defaults - Default configuration for a new thread
   */
  static get defaults() {
    return {
      data: {
        created_at: null,
        responses: {},
        messages: {},
        branches: {},
        path: null,
      }
    };
  }
  // Define the tools
  tools = {
    lookup: {
      type: "function",
      function: {
        name: "lookup",
        description: "Performs a semantic search of the user's data. Use this function to respond to queries like 'Based on my notes...' or any other request that requires surfacing relevant content.",
        parameters: {
          type: "object",
          properties: {
            hypotheticals: {
              type: "object",
              description: "Short hypothetical notes predicted to be semantically similar to the notes necessary to fulfill the user's request. Provide at least three hypotheticals per request. The hypothetical notes may contain paragraphs, lists, or checklists in markdown format. Each hypothetical note should begin with breadcrumbs indicating the anticipated folder(s), file name, and relevant headings separated by ' > ' (no slashes). Example: PARENT FOLDER NAME > CHILD FOLDER NAME > FILE NAME > HEADING 1 > HEADING 2 > HEADING 3: HYPOTHETICAL NOTE CONTENTS.",
              properties: {
                "1": {
                  type: "string",
                },
                "2": {
                  type: "string",
                },
                "3": {
                  type: "string",
                },
              },
              required: ["1", "2", "3"]
            }
          },
          required: ["hypotheticals"]
        }
      }
    }
  };

  /**
   * Imports the SmartSource by checking for updates and parsing content.
   * @async
   * @returns {Promise<void>}
   */
  async import(){
    this._queue_import = false;
    try{
      await this.source_adapter.import();
    }catch(err){
      this.queue_import();
      console.error(err, err.stack);
    }
  }

  /**
   * Renders the thread interface
   * @async
   * @param {HTMLElement} [container] - Container element to render into
   * @returns {DocumentFragment} Rendered thread interface
   */
  async render(container = this.container, opts = {}) {
    const frag = await thread_template.call(this.smart_view, this, opts);
    if (container) {
      container.empty();
      // if container is sc-thread, replace it with the frag
      if (container.classList.contains('sc-thread')) {
        container.replaceWith(frag);
      } else {
        container.appendChild(frag);
      }
    }
    return frag;
  }

  /**
   * Creates a new user message and adds it to the thread
   * @async
   * @param {string} content - The content of the user's message
   */
  async handle_message_from_user(content) {
    try {
      const new_msg_data = {
        thread_key: this.key,
        role: 'user',
        content: [],
      };
      const context = {};
      const language = this.env.settings?.language || 'en';
      // Handle system prompt references (@"system prompt") FIRST
      if (contains_system_prompt_ref(content)) {
        const { mentions, content: content_after_refs } = extract_system_prompt_ref(content);
        context.system_prompt_refs = mentions;
        content = content_after_refs; // remove system prompt references from content
      }
  
      // Handle internal links ([[link]])
      if (contains_internal_link(content)) {
        const internal_links = extract_internal_links(content);
        context.internal_links = internal_links.map(link => {
          return this.env.smart_sources?.fs?.get_link_target_path(link, '/') || link;
        });
      }
  
      // Handle folder references (/folder/ or /folder/subfolder/)
      if (contains_folder_reference(content)) {
        const folders = Object.keys(this.env.smart_sources.fs.folders);
        const folder_refs = extract_folder_references(folders, content);
        context.folder_refs = folder_refs;
      }
  
      // Handle self-referential keywords
      if(contains_self_referential_keywords(content, language)){
        context.has_self_ref = true;
      }
      
      // Handle markdown images LAST to preserve all processed text content
      if (contains_markdown_image(content)) {
        console.log('contains_markdown_image', content);
        if (!this.chat_model.model_config.multimodal) {
          console.warn("Current model does not support multimodal (image) content");
          throw new Error("⚠️ Current model does not support multimodal (image) content");
        }
  
        const images = extract_markdown_images(content);
        if (images.length > 0) {
          images.forEach(image => {
            image.image_path = this.env.smart_sources.fs.get_link_target_path(image.image_path, '/');
            const [before, after] = content.split(image.full_match);
            if(typeof before === 'string' && before.trim().length) new_msg_data.content.push({
              type: 'text',
              text: before,
            });
            new_msg_data.content.push({
              type: 'image_url',
              image_url: null,
              input: image,
            });
            content = after;
          });
        }
      }
  
      if (typeof content === 'string'){
        new_msg_data.content.push({
          type: 'text',
          text: content.trim(),
        });
      } else new_msg_data.content = content;

      if(Object.keys(context).length > 0){
        console.log('creating system message with context', context);
        new_msg_data.context = context;
        await this.create_system_message(context);
      }
      // Create a new SmartMessage for the user's message
      await this.env.smart_messages.create_or_update(new_msg_data);
    } catch (error) {
      console.error("Error in handle_message_from_user:", error);
    }
  }
  // handle creating system message
  async create_system_message(context) {
    const system_message = {
      role: "system",
      content: [],
      thread_key: this.key,
    };
    /**
     * Build system message
     */
    // Combine all context into a single system message
    if (Array.isArray(context.system_prompt_refs) && context.system_prompt_refs.length > 0) {
      context.system_prompt_refs.forEach(key => {
        const system_prompt = {
          type: 'text',
          input: {
            key,
          },
        };
        system_message.content.push(system_prompt);
      });
      // remove system_prompt_refs from context
      context.system_prompt_refs = `added to system message ${system_message.id}`;
    }
    if (context?.has_self_ref || context?.folder_refs) {
      const system_prompt = {
        type: 'text',
        // replace this text with `key` to default system message for lookup
        text: `- Answer based on the context from lookup!\n- The context may be referred to as notes.`,
      };
      system_message.content.push(system_prompt);
    }
    await this.env.smart_messages.create_or_update(system_message);
  }

  /**
   * Processes and adds an AI response to the thread
   * @async
   * @param {Object} response - Raw response from the AI model
   */
  async handle_message_from_chat_model(response, opts = {}) {
    const choices = response.choices;
    const response_id = response.id;
    const msg_items = await Promise.all(choices.map(async (choice, index) => {
      const msg_data = {
        ...(choice?.message || choice), // fallback on full choice to handle non-message choices
        thread_key: this.key,
        response_id,
      };
      const msg = this.messages.find(msg => msg.data.response_id === response_id);
      if(msg){
        msg_data.key = msg.key;
      }
      return this.env.smart_messages.create_or_update(msg_data);
    }));
    return msg_items;
  }

  /**
   * Prepares the request payload for the AI model
   * @async
   * @returns {Object} Formatted request payload
   */
  async to_request() {
    const request = { messages: [] };
    for(const msg of this.messages){
      // Handle send_tool_output_in_user_message setting
      if(this.settings.send_tool_output_in_user_message) {
        // Skip tool messages if they're the last message
        if(msg.is_last_message && msg.role === 'tool') {
          continue;
        }
        // Skip tool calls if not the last message
        if(msg.tool_calls && !msg.is_last_message) {
          continue; 
        }
        // For user messages, append tool output if available
        if(msg.role === 'user' && 
           msg.next_message?.tool_calls?.length && 
           !msg.next_message.is_last_message && 
           msg.next_message.next_message?.role === 'tool') {
          const message = { role: 'user', content: [] };
          const tool_output = await msg.next_message.next_message.tool_call_output_to_request();
          console.log('tool_output', tool_output);
          message.content.push({type: 'text', text: tool_output});
          message.content.push(...(await msg.to_request()).content);
          request.messages.push(message);
          continue;
        }
      }

      request.messages.push(await msg.to_request());
      if(msg.context?.has_self_ref || msg.context?.folder_refs){
        request.tools = [this.tools['lookup']];
        if(msg.is_last_message) request.tool_choice = { type: "function", function: { name: "lookup" } };
      }
    }

    // DO: review these configurations (inherited from v1)
    request.temperature = 0.3;
    request.top_p = 1;
    request.presence_penalty = 0;
    request.frequency_penalty = 0;

    // if last message is tool_call_output then should move the most recent user message to the end of the request
    if(request.messages[request.messages.length - 1]?.tool_call_id){
      const last_user_msg = request.messages.findLast(msg => msg.role === 'user');
      if(last_user_msg){
        request.messages = [
          ...(request.messages.filter(msg => msg !== last_user_msg)),
          last_user_msg,
        ];
        console.log('moved last user message to the end of the request', request.messages);
      }
    }
    return request;
  }


  /**
   * Sends the current thread state to the AI model and processes the response
   * @async
   */
  async complete() {
    this.show_typing_indicator();
    const request = await this.to_request();
    // if streaming and no tool_choice, then stream (may implement streaming for tool calls in the future)
    // if (this.chat_model.can_stream){ // && !request.tool_choice) {
    if (this.chat_model.can_stream && !request.tool_choice) {
      await this.chat_model.stream(request, {
        chunk: this.chunk_handler.bind(this),
        done: this.done_handler.bind(this),
        error: this.error_handler.bind(this),
      });
    } else {
      const response = await this.chat_model.complete(request);
      if(response.error){
        return this.error_handler(response);
      }
      this.data.responses[response.id] = response;
      await this.handle_message_from_chat_model(response);
    }
    this.hide_typing_indicator();
  }
  /**
   * @description
   *  - renders the message
   */
  async chunk_handler(response) {
    const msg_items = await this.handle_message_from_chat_model(response);
    if(msg_items?.length > 0) await msg_items[0].render();
  }
  /**
   * @description
   *  - different from chunk_handler in that it calls init() instead of render()
   * 	- allows handling tool-calls in `message.init()`
   */
  async done_handler(response) {
    const msg_items = await this.handle_message_from_chat_model(response);
    this.data.responses[response.id] = response;
    await msg_items[0].init(); // runs init() to trigger tool_call handlers
  }
  error_handler(response) {
    this.hide_typing_indicator();
    this.render_error(response);
    console.error('error_handler', response);
  }
  async render_error(response, container=this.messages_container) {
    const frag = await error_template.call(this.smart_view, response);
    if(container) container.appendChild(frag);
    return frag;
  }

  /**
   * @property {Object} chat_model - The AI chat model instance
   * @readonly
   */
  get chat_model() { return this.collection.chat_model; }

  get created_at() { 
    if(!this.data.created_at) this.data.created_at = Date.now();
    return this.data.created_at;
  }

  /**
   * @property {HTMLElement} container - Container element for the thread UI
   */
  get container() {
    return this.collection.container?.querySelector('.sc-thread');
  }

  get messages_container() { return this.container?.querySelector('.sc-message-container'); }
  /**
   * @property {Array<SmartMessage>} messages - All messages in the thread
   * @readonly
   */
  get messages() {
    return Object.entries(this.data.messages || {})
      .sort((a, b) => a[1] - b[1])
      .map(([key, msg_i]) => this.env.smart_messages.get(this.key + '#' + key))
    ;
  }
  /**
   * @alias {Array<SmartMessage>} messages
   * @readonly
   */
  get blocks() { return this.messages; }

  get_key(){
    if(!this.data.key) this.data.key = 'Untitled ' + this.created_at;
    return this.data.key;
  }
  /**
   * @property {string} path - Path identifier for the thread
   * @readonly
   */
  get path() {
    if(!this.data.path){
      this.data.path = this.collection.source_dir + '/' + this.key + '.' + this.source_adapter.extension;
    }
    return this.data.path;
  }

  /**
   * Processes base64 encoding for image files
   * @async
   * @param {string} file_path - Path to the image file
   * @returns {string} Base64 encoded image data URL
   */
  async process_image_to_base64(file_path) {
    const file = this.env.smart_connections_plugin?.app.vault.getFileByPath(file_path);
    if (!file) return null;
    
    const base64 = await this.env.smart_sources.fs.read(file.path, 'base64');
    return `data:image/${file.extension};base64,${base64}`;
  }
  /**
   * Queues the thread for saving via the collection.
   * @returns {void}
   */
  queue_save() {
    if(this.messages.length === 0) return;
    this._queue_save = true;
    this.collection?.queue_save();
  }
  async save() {
    await this.source_adapter.save();
  }

  async rename(new_name) {
    await this.source_adapter.rename(new_name);
  }

  /**
   * Get all branches for a specific message index
   * @param {number} msg_i - Message index to get branches for
   * @returns {Array<Object>} Array of branch message objects
   */
  get_branches(msg_i) {
    return this.data.branches?.[msg_i] || [];
  }

  /**
   * Get the latest branch for a specific message index
   * @param {number} msg_i - Message index to get latest branch for
   * @returns {Object|null} Latest branch message object or null if no branches exist
   */
  get_latest_branch(msg_i) {
    const branches = this.get_branches(msg_i);
    return branches.length > 0 ? branches[branches.length - 1] : null;
  }

  /**
   * Create a new branch from a specific message index
   * @param {number} msg_i - Message index to branch from
   * @param {Object} branch_messages - Messages to store in the branch
   */
  create_branch(msg_i, branch_messages) {
    if (!this.data.branches) this.data.branches = {};
    if (!this.data.branches[msg_i]) this.data.branches[msg_i] = [];
    this.data.branches[msg_i].push(branch_messages);
    this.queue_save();
  }
  move_to_branch(msg_i, branch_messages){
    this.create_branch(msg_i, branch_messages);
    Object.keys(branch_messages).forEach(id => delete this.data.messages[id]);
    this.queue_save();
  }

  /**
   * Cycles to the next branch for a given message index
   * @param {number} msg_i - Message index to cycle branches for
   * @returns {Promise<void>}
   */
  async cycle_branch(msg_i) {
    if (!this.data.branches) this.data.branches = {};
    if (!this.data.branches[msg_i]) this.data.branches[msg_i] = [];
    
    // Get current branch index (1 is main branch)
    const current_msg = this.messages.find(msg => this.data.messages[msg.id] === msg_i);
    if (!current_msg) return console.warn('no current message found for msg_i', msg_i);

    // Get current messages state including the message at msg_i
    const current_messages = Object.entries(this.data.messages)
      .filter(([_, _msg_i]) => _msg_i >= msg_i)
      .reduce((acc, [id, _msg_i]) => ({ ...acc, [id]: _msg_i }), {})
    ;

    this.move_to_branch(msg_i, current_messages);
    const branch = this.data.branches?.[msg_i]?.shift();
    this.data.messages = {
      ...this.data.messages,
      ...branch,
    };
    await this.render();
    this.queue_save();
  }

  /**
   * Shows the typing indicator
   * @private
   */
  show_typing_indicator() {
    const indicator = this.container?.querySelector('.sc-typing-indicator');
    if (indicator) {
      indicator.classList.add('visible');
    }
  }

  /**
   * Hides the typing indicator
   * @private
   */
  hide_typing_indicator() {
    const indicator = this.container?.querySelector('.sc-typing-indicator');
    if (indicator) {
      indicator.classList.remove('visible');
    }
  }

}
