import { SmartBlock } from "smart-sources";
import { render as message_template } from "./components/message";
import { render as context_template } from "./components/context";
import { render as tool_calls_template } from "./components/tool_calls";
import { render as system_message_template } from "./components/system_message";
import { get_translated_context_suffix_prompt, get_translated_context_prefix_prompt } from "./utils/self_referential_keywords";
/**
 * @class SmartMessage
 * @extends SmartBlock
 * @description Represents a single message in a chat thread. Handles content parsing, context extraction,
 * and integration with various data sources including folders, internal links, and system prompts.
 * Supports both text and image content types.
 */
export class SmartMessage extends SmartBlock {
  /**
   * @static
   * @property {Object} defaults - Default data object for a new message
   * @returns {Object}
   * @property {string} thread_key - Key for the thread
   * @property {string} role - Message role ('user' or 'assistant')
   * @property {number} msg_i - Message index
   * @property {string} id - Message ID
   * @property {Array<Object>|null} content - Message content
   * @property {Array<Object>|null} tool_calls - Tool calls
   * @property {string|null} tool_call_id - Tool call ID
   * @property {Object|null} context - Message context
   */
  static get defaults() {
    return {
      data: {
        thread_key: null,
        content: null,
        role: null,
        tool_calls: null,
        tool_call_id: null,
        msg_i: null,
        id: null,
        context: {},
        tool_call_output: null,
      }
    };
  }

  /**
   * Generates a unique key for the message
   * @returns {string} Unique message identifier
   */
  get_key() { return `${this.data.thread_key}#${this.id}`; }

  get msg_i() {
    if(!this.data.msg_i) {
      const msg_i = Object.keys(this.thread.data.messages || {}).length + 1;
      this.data.msg_i = msg_i;
    }
    return this.data.msg_i;
  }
  get branch_i() {
    if(!this.data.branch_i){
      const branch_i =  Date.now() + '-' + ((this.thread.data.branches?.[this.msg_i] || []).length + 1);
      this.data.branch_i = branch_i;
    }
    return this.data.branch_i;
  }
  get id() {
    if(!this.data.id){
      this.data.id = `${this.role}-${this.msg_i}-${this.branch_i}`;
    }
    return this.data.id;
  }

  /**
   * Initializes the message and triggers processing if it's a user message
   * @async
   */
  async init() {
    while (!this.thread) await new Promise(resolve => setTimeout(resolve, 100)); // this shouldn't be necessary (why is it not working without this?)
    if(!this.thread.data.messages[this.id]){
      this.thread.data.messages[this.id] = this.msg_i;
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    await this.render();
    if(this.role === 'user') {
      await this.thread.complete();
    }else if(this.tool_calls?.length > 0){
      await this.handle_tool_calls();
    }else if(this.role === 'tool'){
      if(!this.settings.review_context){
        this.thread.complete();
      }
    }
    this.queue_save();
  }

  /**
   * Queues the message for saving via the thread.
   * @returns {void}
   */
  queue_save() {
    this._queue_save = true;
    this.thread?.queue_save();
  }

  /**
   * Renders the message in the UI
   * @async
   * @param {HTMLElement} [container] - Container element to render into
   * @returns {DocumentFragment} Rendered message interface
   */
  async render(container=this.thread.messages_container) {
    let frag;
    if(this.role === 'system'){
      frag = await system_message_template.call(this.smart_view, this);
    }else if(this.tool_calls?.length > 0){
      frag = await tool_calls_template.call(this.smart_view, this);
    }else if(this.role === 'tool'){
      frag = await context_template.call(this.smart_view, this);
    }else{
      frag = await message_template.call(this.smart_view, this);
    }
    if(container) {
      this.elm = container.querySelector(`#${this.data.id}`);
      if (this.elm) this.elm.replaceWith(frag);
      else {
        container.appendChild(frag);
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
    return frag;
  }

  /**
   * Fetches and processes internal links, embedding images as Base64 data URLs.
   * @async
   * @param {Array<string>} paths - Array of paths to fetch content from
   * @returns {Array<Object>} contents - Array of content objects:
   * @returns {string} contents[].type - Content type ('text' or 'image')
   * @returns {string} [contents[].content] - Text content if type is 'text'
   * @returns {string} [contents[].image_url] - Base64 image URL if type is 'image'
   * @throws {Error} When unable to fetch or process content
   */
  async fetch_content(paths) {
    try {
      const image_extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'heic', 'heif', 'ico'];
      const contents = await Promise.all(paths.map(async (path) => {
        if (path) {
          try{
            const item = this.env.smart_blocks.get(path) || this.env.smart_sources.get(path);
            // Check if the link is an image
            const file_extension = path.split('.').pop().toLowerCase();
            if (image_extensions.includes(file_extension)) {
              // DO (future): may return already extracted text if exists in item.data.content
              const image_data = await this.env.smart_sources.fs.read(path, 'base64');
              const base64_image = `data:image/${file_extension};base64,${image_data}`;
              return { type: 'image', image_url: base64_image };
            } else {
              // If not an image, return the text content
              return { type: 'text', content: await item.read() };
            }
          }catch(e){
            console.error(`Error fetching content for ${path}:`, e);
            return { type: 'error', content: 'Failed to fetch content' };
          }
        }
      }));
      return contents;
    } catch (error) {
      console.error(`Error fetching internal links content:`, error);
      return [];
    }
  }

  async handle_tool_calls(){
    for(const tool_call of this.tool_calls){
      if(tool_call.function.name === 'lookup'){
        await this.handle_lookup_tool_call(tool_call);
      }
    }
  }

  build_lookup_params(args){
    const params = {};
    args = typeof args === 'string' ? JSON.parse(args) : args;
    if(Array.isArray(args.hypotheticals)){
      params.hypotheticals = args.hypotheticals;
    }else if(typeof args.hypotheticals === 'object' && args.hypotheticals !== null){
      params.hypotheticals = Object.values(args.hypotheticals);
    }else if(typeof args.hypotheticals === 'string'){
      params.hypotheticals = [args.hypotheticals];
    }else{
      console.warn('Invalid hypotheticals provided for lookup tool call, using user message as lookup context, args:' + JSON.stringify(args));
      params.hypotheticals = [this.content];
    }
    params.hypotheticals = params.hypotheticals.map(h => {
      if(typeof h === 'string') return h;
      else return JSON.stringify(h);
    })
    if(this.previous_message.context.folder_refs) params.filter = {
      key_starts_with_any: this.previous_message.context.folder_refs
    };
    params.filter = {
      ...(params.filter || {}),
      limit: this.settings.lookup_limit || 10,
    };
    return params;
  }
  async handle_lookup_tool_call(tool_call){
    const params = this.build_lookup_params(tool_call.function.arguments);
    const lookup_collection = this.env.smart_blocks.settings.embed_blocks ? this.env.smart_blocks : this.env.smart_sources;
    const lookup_results = (await lookup_collection.lookup(params))
      .map(result => ({
        key: result.item.key,
        score: result.score,
      }))
    ;
    const msg_i = Object.keys(this.thread.data.messages || {}).length + 1;
    const branch_i = (this.thread.data.branches?.[msg_i] || []).length + 1;
    await this.env.smart_messages.create_or_update({
      thread_key: this.thread.key,
      tool_call_id: tool_call.id,
      tool_name: tool_call.function.name,
      tool_call_output: lookup_results,
      role: 'tool',
      response_id: tool_call.id,
      id: `tool-${msg_i}-${branch_i}`,
    });
  }

  /**
   * Converts the message to a request payload
   * @returns {Array<Object>} Request payload
   */
  async to_request(){
    const this_message = { role: this.role, content: [] };

    // Add context to first part(s) of content
    if (this.context.internal_links && this.context.internal_links.length > 0) {
      const internal_links_content = await this.fetch_content(this.context.internal_links);
      if (internal_links_content) {
        let context_content = '';
        this.context.internal_links.forEach((link, index) => {
          if (internal_links_content[index].type === 'text') {
            if(!context_content.length) context_content += `Context specified in message:`;
            context_content += `\n-----------------------\n`;
            context_content += `/${link}\n`;
            context_content += `---\n`;
            context_content += `${internal_links_content[index].content}\n`;
            context_content += `-----------------------\n`;
          } else if (internal_links_content[index].type === 'image') {
            this_message.content.push({
              type: 'image_url',
              image_url: {
                url: internal_links_content[index].image_url,
              },
            });
          }
        });
        if(context_content.length > 0) this_message.content.push({
          type: 'text',
          text: context_content,
        });
      }
    }

    // Add remaining content and inline images
    if(typeof this.content === 'string'){
      this_message.content.push({
        type: 'text',
        text: this.content,
      });
    }else if(Array.isArray(this.content)){
      for(const part of this.content){
        if(part.type === 'text'){
          let text = part.text || '';
          if(!text && part.input?.key){
            text = await this.env.smart_sources.get(part.input.key)?.read() || '';
          }
          if(!text && part.input?.key){
            text = await this.env.smart_sources.fs.read(part.input.key) || '';
          }
          this_message.content.push({
            type: 'text',
            text: text,
          });
        }else if(part.type === 'image_url'){
          const base64_img = await this.env.smart_sources.fs.read(part.input.image_path, 'base64');
          if(base64_img){
            const extension = part.input.image_path.split('.').pop();
            const base64_url = `data:image/${extension};base64,${base64_img}`;
            this_message.content.push({
              type: 'image_url',
              image_url: {
                url: base64_url,
              },
            });
          }else{
            console.warn(`Image not found: ${part.input.image_url}`);
            this_message.content.push({
              type: 'text',
              text: `Image not found: ${part.input.image_url}`,
            });
          }
        }
      }
    }

    // Add tool calls and tool call output
    if (this.tool_calls?.length){
      this_message.tool_calls = this.tool_calls;
      delete this_message.content; // empty content causes issues in OpenRouter OpenAI endpoints
    }
    if (this.tool_call_id) this_message.tool_call_id = this.tool_call_id;
    if (this.tool_call_output?.length) this_message.content = await this.tool_call_output_to_request();
    return this_message;
  }

  async tool_call_output_to_request() {
    if(this.tool_name === 'lookup'){
      // // RETURNS LOOKUP OUTPUT AS JSON
      if(this.settings.tool_call_output_as_json){
        const lookup_collection = this.tool_call_output[0]?.key.includes('#') ? this.env.smart_blocks : this.env.smart_sources;
        const tool_call_output = await Promise.all(this.tool_call_output.map(async (result) => ({ ...result, content: (await lookup_collection.get(result.key).read()) })));
        return JSON.stringify(tool_call_output);
      }
  
      // RETURNS LOOKUP OUTPUT AS TEXT
      const lookup_content = await this.fetch_content(this.tool_call_output.map(result => result.key));
      const prefix_prompt = get_translated_context_prefix_prompt(this.thread.language);
      let lookup_output = `${prefix_prompt}\n`;
      this.tool_call_output.forEach((result, index) => {
        if (lookup_content[index]?.type === 'text') {
          lookup_output += `-----------------------\n`;
          lookup_output += `/${result.key} (relevance score: ${result.score})\n`;
          lookup_output += `---\n`;
          lookup_output += `${lookup_content[index].content}\n`;
          lookup_output += `-----------------------\n\n`;
        } // should images be added here?
      });
      const suffix_prompt = get_translated_context_suffix_prompt(this.thread.language);
      return lookup_output + suffix_prompt;
    }
  }

  /**
   * @property {string} content - Message content
   */
  get content() { return this.data.content; }
  set content(value) { this.data.content = value; }

  /**
   * @property {string} role - Message sender role ('user' or 'assistant')
   */
  get role() { return this.data.role; }
  set role(value) { this.data.role = value; }

  /**
   * @property {Object} tool_calls - Tool calls
   */
  get tool_calls() { return this.data.tool_calls; }
  set tool_calls(value) { this.data.tool_calls = value; }

  /**
   * @property {string} tool_call_id - Tool call ID
   */
  get tool_call_id() { return this.data.tool_call_id; }
  set tool_call_id(value) { this.data.tool_call_id = value; }

  /**
   * @property {Array<Object>} tool_call_output - Tool call output
   */
  get tool_call_output() { return this.data.tool_call_output; }
  set tool_call_output(value) { this.data.tool_call_output = value; }

  /**
   * @property {string} tool_name - Tool name
   */
  get tool_name() { return this.data.tool_name; }
  set tool_name(value) { this.data.tool_name = value; }

  /**
   * @property {Object} context - Message context data
   */
  get context() { return this.data.context; }
  set context(value) { this.data.context = value; }


  /**
   * @property {SmartThread} thread - Parent thread reference
   * @readonly
   */
  get thread() { return this.source; }


  /**
   * @property {SmartMessage} next_message - Next message reference
   * @readonly
   */
  get next_message() { return this.thread.messages[this.msg_i]; }

  /**
   * @property {SmartMessage} previous_message - Previous message reference
   * @readonly
   */
  get previous_message() { return this.thread.messages[this.msg_i - 2]; }

  /**
   * @property {boolean} is_last_message - Whether the message is the last message in the thread
   * @readonly
   */
  get is_last_message() { return this.msg_i === Object.keys(this.thread.messages).length; }

  /**
   * @property {string} source_key - Key for source reference
   * @readonly
   */
  get source_key() { return this.data.thread_key; }

  /**
   * @property {SmartThreads} source_collection - Collection reference
   * @readonly
   */
  get source_collection() { return this.env.smart_threads; }

  /**
   * @property {string} path - Path identifier for the message
   * @readonly
   */
  get path() { return this.data.thread_key; }

  get settings() { return this.thread.settings; }

  get has_image() { return this.content.some(part => part.type === 'image_url'); }
}
