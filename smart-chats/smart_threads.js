import { SmartSources, SmartSource, SmartBlocks, SmartBlock } from "smart-sources";
import { render as chat_template } from "./components/threads.js";
import { render as settings_template } from "./components/settings.js";
import { SmartThreadDataOpenaiJsonAdapter } from "./adapters/openai_json.js";

export class SmartThreads extends SmartSources {
  async init() {
    await this.fs.init();
    await this.chat_model.get_models(); // pre-load models for settings
  }
  async render(container=this.container, opts={}) {
    if(Object.keys(opts).length > 0) this.render_opts = opts; // persist render options for future renders (not ideal, but required since declaring render_opts outside of this class)
    if(container && (!this.container || this.container !== container)) this.container = container;
    const frag = await chat_template.call(this.smart_view, this, this.render_opts);
    container.innerHTML = '';
    container.appendChild(frag);
    return frag;
  }
  get chat_model() {
    if (!this._chat_model) {
      this._chat_model = new this.env.opts.modules.smart_chat_model.class({
        settings: this.settings.chat_model,
        adapters: this.env.opts.modules.smart_chat_model.adapters,
        http_adapter: this.env.opts.modules.smart_chat_model.http_adapter,
        re_render_settings: this.render_settings.bind(this),
      });
    }
    return this._chat_model;
  }
  get chat_model_settings() {
    return this.settings?.chat_model?.[this.settings.chat_model?.platform_key || 'openai'];
  }
  get container() { return this._container; }
  set container(container) { this._container = container; }
  get current() { return this._current; }
  set current(thread) { this._current = thread; }
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + ".smart-env/chats"; }
  get default_settings() {
    return {
      chat_model: {
        platform_key: 'openai',
        openai: {
          model_key: 'gpt-4o',
        },
      },
      embed_model: {
        model_key: 'None',
      },
    };
  }
  get fs() {
    if(!this._fs){
      this._fs = new this.env.opts.modules.smart_fs.class(this.env, {
        adapter: this.env.opts.modules.smart_fs.adapter,
        fs_path: this.data_folder,
      });
    }
    return this._fs;
  }
  get render_settings_component() {
    return settings_template.bind(this.smart_view);
  }
  get settings_config() {
    return this.process_settings_config(this.chat_model.settings_config, `chat_model`);
  }
}

import { render as thread_template } from "./components/thread.js";
export class SmartThread extends SmartSource {
  static get defaults() {
    return {
      data: {
        created_at: null,
        responses: {},
        messages: {},
      }
    }
  }

  get_key() {
    return this.data.created_at ? this.data.created_at : this.data.created_at = Date.now().toString();
  }
  async render(container = this.container) {
    if(!container){
      container = this.collection.container.querySelector('.sc-chat-box');
    }
    if(!container) return console.warn("No container found for SmartThread");
    if(!this.container) this.container = container;
    const frag = await thread_template.call(this.smart_view, this);
    if (container) {
      container.empty();
      container.appendChild(frag);
    }
    return frag;
  }

  /**
   * Handles sending a user message.
   */
  async handle_send() {
    try {
      // Access the chat input textarea from the UI
      const input_field = this.container.querySelector('.sc-chat-input');
      const message_content = input_field.value.trim();

      // Validate input
      if (!message_content) {
        // Optionally, provide user feedback for empty input
        console.warn("Cannot send empty message.");
        return;
      }

      // Create and add the user message
      await this.new_user_message(message_content);

      // Clear the input field
      input_field.value = '';

      // Scroll to the latest message
      this.container.scrollTop = this.container.scrollHeight;

    } catch (error) {
      console.error("Error in handle_send:", error);
    }
  }

  /**
   * Creates a new user message and adds it to the thread.
   * @param {string} content - The content of the user's message.
   */
  async new_user_message(content) {
    this.collection.current = this;
    try {
      const new_msg_data = {
        thread_key: this.key,
        content: content,
        role: 'user',
        msg_i: Object.keys(this.data.messages || {}).length + 1,
      };
      // Create a new SmartMessage for the user's message
      await this.env.smart_messages.create_or_update(new_msg_data);
    } catch (error) {
      console.error("Error in new_user_message:", error);
    }
  }

  async new_response(response) {
    const { messages } = await this.parse_response(response);
    const msg_i = Object.keys(this.data.messages || {}).length + 1;
    const msg_items = await Promise.all(messages.map(message => this.env.smart_messages.create_or_update({
      ...message,
      thread_key: this.key,
      msg_i,
    })));
    this.container.scrollTop = this.container.scrollHeight;
  }

  async parse_response(response) {
    return await this.chat_data_adapter.parse_response(response);
  }

  async to_request() {
    return await this.chat_data_adapter.to_request();
  }

  async complete() {
    const request = await this.to_request();
    const response = await this.chat_model.complete(request);
    await this.new_response(response);
  }

  get chat_data_adapter() {
    if (!this._chat_data_adapter) {
      this._chat_data_adapter = new SmartThreadDataOpenaiJsonAdapter(this);
    }
    return this._chat_data_adapter;
  }
  get chat_model() { return this.collection.chat_model; }
  get container() { return this._container; }
  set container(container) { this._container = container; }

  get messages() { return Object.keys(this.data.messages || {}).map(key => this.env.smart_messages.get(key)); }

  // necessary source overrides
  get path() { return this.data.created_at; }


}

export class SmartMessages extends SmartBlocks {
  process_load_queue() {}
  process_import_queue() {}
  get data_folder() { return this.env.opts.env_path + (this.env.opts.env_path ? "/" : "") + "multi" + "/" + "chats"; }
  init() {}
}

import { render as message_template } from "./components/message.js";
import { contains_folder_reference, extract_folder_references } from "./utils/folder_references.js";
import { contains_internal_link, extract_internal_links } from "./utils/internal_links.js";
import { contains_self_referential_keywords } from "./utils/self_referential_keywords.js";
import { contains_system_prompt_ref, extract_system_prompt_ref } from "./utils/system_prompts.js";
export class SmartMessage extends SmartBlock {
  static get defaults() {
    return {
      data: {
        thread_key: null,
        content: null,
        role: null,
        tool_calls: null,
        tool_call_id: null,
        image_url: null,
        msg_i: null,
      }
    }
  }
  get_key() { return `${this.data.thread_key}#${this.data.msg_i}`; }
  async init() {
    while(!this.thread) await new Promise(resolve => setTimeout(resolve, 100)); // this shouldn't be necessary (why is it not working without this?)
    this.thread.data.messages[this.key] = true;
    await this.render();
    if(this.data.role === 'user'){
      await this.parse_user_message();
      await this.thread.complete();
    }
  }
  async render(container=this.thread.container) {
    const frag = await message_template.call(this.smart_view, this);
    if(container) container.appendChild(frag);
    return frag;
  }

  /**
   * Parses a user message instance using OLD parsing utilities.
   * Handles folder references, internal links, self-referential keywords, and system prompts.
   * @param {Object} message_instance - The message instance to parse.
   * @returns {Object} Parsed message suitable for OpenAI API.
   */
  async parse_user_message() {
    this.context = {};
    let content = this.data.content;
    const language = this.env.settings?.language || 'en'; // Default to English if not set

    // Handle system prompt references (@"system prompt")
    // FIRST because path may interfere with internal links or folder references detection
    if (contains_system_prompt_ref(content)) {
      const { mentions, content: content_after_refs } = extract_system_prompt_ref(content);
      this.context.system_prompt_refs = mentions;
      content = content_after_refs; // remove system prompt references from content
    }

    // Handle internal links ([[link]])
    if (contains_internal_link(content)) {
      const internal_links = extract_internal_links(this.env, content);
      this.context.internal_links = internal_links;
    }

    // Handle folder references (/folder/ or /folder/subfolder/)
    if (contains_folder_reference(content)) {
      const folders = Object.keys(this.env.smart_sources.fs.folders);
      const folder_refs = extract_folder_references(folders, content);
      this.context.folder_refs = folder_refs;
    }

    // Handle self-referential keywords
    // triggers HyDE Lookup (likely to be replaced by peristent lookup tool in the future)
    this.context.has_self_ref = contains_self_referential_keywords(content, language);
    if(this.context.has_self_ref || this.context.folder_refs){
      this.context.hypotheticals = await this.get_hypotheticals(this.data.content);
      const lookup_params = {hypotheticals: this.context.hypotheticals};
      if(this.context.folder_refs){
        lookup_params.filter = {
          key_starts_with_any: this.context.folder_refs
        };
      }
      const lookup_collection = this.env.smart_blocks.settings.embed_blocks ? this.env.smart_blocks : this.env.smart_sources;
      this.context.lookup_results = (await lookup_collection.lookup(lookup_params))
        .map(result => ({
          key: result.item.key,
          score: result.score,
        }))
      ;
    }

    this.data.content = content.trim();
    return this.context;
  }
  
  /**
   * Constructs a message with its associated context based on the parsed user input.
   * This includes internal links, folder references, and system prompt references.
   *
   * @returns {Object} An object containing the assembled messages with context.
   */
  async get_message_with_context() {
    const messages = [];
    let user_content = "";
    let system_content = "";

    // Combine all context into a single system message
    if (this.context.system_prompt_refs && this.context.system_prompt_refs.length > 0) {
      const system_prompts = await this.fetch_content(this.context.system_prompt_refs);
      if (system_prompts) {
        for(const system_prompt of system_prompts){
          if(system_prompt.type === 'text'){
            system_content += `${system_prompt.content}\n\n`;
          }
        }
      }
    }
    // Add system message if there's any content
    if (system_content) {
      messages.push({
        role: "system",
        content: system_content.trim()
      });
    }

    if (this.context.internal_links && this.context.internal_links.length > 0) {
      const internal_links_content = await this.fetch_content(this.context.internal_links);
      if (internal_links_content) {
        user_content += `Context specified in message:\n`;
        this.context.internal_links.forEach((link, index) => {
          if(internal_links_content[index].type === 'text'){
            user_content += `-----------------------\n`;
            user_content += `/${link.path}\n`;
            user_content += `---\n`;
            user_content += `${internal_links_content[index].content}\n`;
            user_content += `-----------------------\n\n`;
          }else if(internal_links_content[index].type === 'image'){
            messages.push({
              role: 'user',
              image_url: internal_links_content[index].image_url,
            });
          }
        });
      }
    }

    if(this.context.lookup_results && this.context.lookup_results.length > 0){
      const lookup_content = await this.fetch_content(this.context.lookup_results.map(result => result.key));
      user_content += `Context from lookup:\n`;
      this.context.lookup_results.forEach((result, index) => {
        if(lookup_content[index].type === 'text'){
          user_content += `-----------------------\n`;
          user_content += `/${result.key} (relevance score: ${result.score})\n`;
          user_content += `---\n`;
          user_content += `${lookup_content[index].content}\n`;
          user_content += `-----------------------\n\n`;
        } // should images be added here?
      });
    }


    if(user_content){
      user_content += "Message from user:\n";
    }
    user_content += this.data.content;
    // Add the user's message
    messages.push({
      role: this.role,
      content: user_content
    });

    return messages;
  }

  /**
   * Fetches and processes internal links, embedding images as Base64 data URLs.
   *
   * @param {Array<string>} paths - Array of paths.
   * @returns {string} Concatenated content from the paths with images embedded.
   */
  async fetch_content(paths) {
    try {
      const image_extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'heic', 'heif', 'ico'];
      const contents = await Promise.all(paths.map(async (path) => {
        if (path) {
          const item = this.env.smart_blocks.get(path) || this.env.smart_sources.get(path);
          // Check if the link is an image
          const file_extension = path.split('.').pop().toLowerCase();
          if (image_extensions.includes(file_extension)) {
            // DO (future): may return already extracted text if exists in item.data.content
            const image_data = await this.env.smart_sources.fs.read(path, 'base64');
            const base64_image = `data:image/${file_extension};base64,${image_data}`;
            return {type: 'image', image_url: base64_image};
          }else{
            // If not an image, return the text content
            return {type: 'text', content: await item.read()};
          }
        }
      }));
      return contents;
    } catch (error) {
      console.error(`Error fetching internal links content:`, error);
      return [];
    }
  }

  async get_hypotheticals(content) {
    try {
      // Prepare the function call for HyDE Lookup
      const hyde_fx_call = {
        role: "user",
        content,
      };

      // Define the function definitions
      const tools = [
        {
          type: "function",
          function: {
            name: "lookup",
            description: "Performs a semantic search of the user's data. Use this function to respond to queries like 'Based on my notes...' or any other request that requires surfacing relevant content.",
            parameters: {
              type: "object",
              properties: {
                hypotheticals: {
                  type: "array",
                  description: "Short hypothetical notes predicted to be semantically similar to the notes necessary to fulfill the user's request. Provide at least three hypotheticals per request. The hypothetical notes may contain paragraphs, lists, or checklists in markdown format. Each hypothetical note should begin with breadcrumbs indicating the anticipated folder(s), file name, and relevant headings separated by ' > ' (no slashes). Example: PARENT FOLDER NAME > CHILD FOLDER NAME > FILE NAME > HEADING 1 > HEADING 2 > HEADING 3: HYPOTHETICAL NOTE CONTENTS.",
                  items: {
                    type: "string"
                  }
                }
              },
              required: ["hypotheticals"]
            }
          }
        }
      ];

      // Prepare the request payload
      const request = {
        messages: [
          {
            role: "system",
            content: `Anticipate what the user is seeking. Respond in the form of a hypothetical note written by the user. The note may contain statements as paragraphs, lists, or checklists in markdown format with no headings. Please respond with one hypothetical note and abstain from any other commentary. Use the format: PARENT FOLDER NAME > CHILD FOLDER NAME > FILE NAME > HEADING 1 > HEADING 2 > HEADING 3: HYPOTHETICAL NOTE CONTENTS.`
          },
          hyde_fx_call
        ],
        tools: tools,
        tool_choice: { type: "function", function: { name: "lookup" } }
      };

      // **Invoke the Chat Model to Complete the Request**
      const response = await this.thread.chat_model.complete(request);

      console.log("HyDE Lookup Response:", response);

      return this.parse_hypotheticals(response);

    } catch (error) {
      console.error("HyDE Lookup Error:", error);
    }
  }
  parse_hypotheticals(response) {
    return JSON.parse(response.choices[0].message.tool_calls[0].function.arguments || '{}').hypotheticals;
  }

  get content() { return this.data.content; }
  get context() { return this.data.context; }
  set context(context) { this.data.context = context; }
  get role() { return this.data.role; }
  get thread() { return this.source; }
  // necessary source overrides
  get source_key() { return this.data.thread_key; }
  get source_collection() { return this.env.smart_threads; }
  get path() { return this.data.thread_key; }
}
