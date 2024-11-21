import { SmartBlock } from "smart-sources";
import { render as message_template } from "./components/message";
import { contains_folder_reference, extract_folder_references } from "./utils/folder_references";
import { contains_internal_link, extract_internal_links } from "./utils/internal_links";
import { contains_self_referential_keywords } from "./utils/self_referential_keywords";
import { contains_system_prompt_ref, extract_system_prompt_ref } from "./utils/system_prompts";
import { render as context_template } from "./components/context";
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
   * @property {Object} defaults - Default configuration for a new message
   */
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
        id: null,
      }
    };
  }

  /**
   * Generates a unique key for the message
   * @returns {string} Unique message identifier
   */
  // get_key() { return `${this.data.thread_key}#${this.data.msg_i}`; }
  get_key() { return `${this.data.thread_key}#${this.data.id}`; }

  /**
   * Initializes the message and triggers processing if it's a user message
   * @async
   */
  async init() {
    while (!this.thread) await new Promise(resolve => setTimeout(resolve, 100)); // this shouldn't be necessary (why is it not working without this?)
    this.thread.data.messages[this.data.id] = this.data.msg_i;
    if(this.role === 'user') {
      this.parse_user_message();
      await this.render();
      await this.retrieve_context();
      // FUTURE: may replace lookup-specific conditional with `Object.keys(this.context).length > 0` for reviewing additional extracted context
      if(this.settings.review_context && this.context.lookup_results?.length > 0){
        // skip completion to await user submission in context review UI
      }else{
        await this.thread.complete();
      }
    }else{
      await this.render();
    }
  }

  /**
   * Renders the message in the UI
   * @async
   * @param {HTMLElement} [container] - Container element to render into
   * @returns {DocumentFragment} Rendered message interface
   */
  async render(container=this.thread.messages_container) {
    const frag = await message_template.call(this.smart_view, this);
    this.elm = container.querySelector(`#${this.data.id}`);
    if (this.elm) this.elm.replaceWith(frag);
    else {
      container.appendChild(frag);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    return frag;
  }
  async render_context(container=this.thread.messages_container) {
    const frag = await context_template.call(this.smart_view, this);
    const context_container = container.querySelector(`#context-container-${this.data.id}`);
    if (context_container) context_container.replaceWith(frag);
    else container.appendChild(frag);
  }

  /**
   * Parses a user message instance using OLD parsing utilities.
   * @param {Object} message_instance - The message instance to parse
   * @returns {Object} context - Parsed context object containing:
   * @returns {Array<string>} [context.system_prompt_refs] - Referenced system prompts
   * @returns {Array<Object>} [context.internal_links] - Extracted internal links
   * @returns {Array<string>} [context.folder_refs] - Referenced folders
   * @returns {boolean} [context.has_self_ref] - Whether message contains self-references
   * @returns {Array<string>} [context.hypotheticals] - Generated hypothetical notes
   * @returns {Array<Object>} [context.lookup_results] - Semantic search results
   */
  parse_user_message() {
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
    
    this.data.content = content.trim();
  }
  
  async retrieve_context(){
    if (this.context.has_self_ref || this.context.folder_refs) {
      this.context.hypotheticals = await this.get_hypotheticals();
      const lookup_params = { hypotheticals: this.context.hypotheticals };
      if (this.context.folder_refs) {
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
    await this.render_context();
  }

  /**
   * Constructs a message with its associated context based on the parsed user input.
   * @async
   * @returns {Array<Object>} messages - Array of message objects containing:
   * @returns {Object} [messages[].role] - Message role ('system' or 'user')
   * @returns {string} [messages[].content] - Text content including context
   * @returns {string} [messages[].image_url] - Base64 encoded image URL if present
   */
  async get_message_with_context() {
    const messages = [];
    let user_content = "";
    let system_content = "";

    // Combine all context into a single system message
    if (this.context.system_prompt_refs && this.context.system_prompt_refs.length > 0) {
      const system_prompts = await this.fetch_content(this.context.system_prompt_refs);
      if (system_prompts) {
        for (const system_prompt of system_prompts) {
          if (system_prompt.type === 'text') {
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
          if (internal_links_content[index].type === 'text') {
            user_content += `-----------------------\n`;
            user_content += `/${link.path}\n`;
            user_content += `---\n`;
            user_content += `${internal_links_content[index].content}\n`;
            user_content += `-----------------------\n\n`;
          } else if (internal_links_content[index].type === 'image') {
            messages.push({
              role: 'user',
              image_url: internal_links_content[index].image_url,
            });
          }
        });
      }
    }

    if (this.context.lookup_results && this.context.lookup_results.length > 0) {
      const lookup_content = await this.fetch_content(this.context.lookup_results.map(result => result.key));
      user_content += `Context from lookup:\n`;
      this.context.lookup_results.forEach((result, index) => {
        if (lookup_content[index].type === 'text') {
          user_content += `-----------------------\n`;
          user_content += `/${result.key} (relevance score: ${result.score})\n`;
          user_content += `---\n`;
          user_content += `${lookup_content[index].content}\n`;
          user_content += `-----------------------\n\n`;
        } // should images be added here?
      });
    }


    if (user_content) {
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
        }
      }));
      return contents;
    } catch (error) {
      console.error(`Error fetching internal links content:`, error);
      return [];
    }
  }

  /**
   * Generates hypothetical notes for semantic search context
   * @async
   * @param {string} content - User message content to generate hypotheticals from
   * @returns {Array<string>} hypotheticals - Array of generated hypothetical notes
   * @returns {string} hypotheticals[] - Each hypothetical in format: "FOLDER > FILE > HEADING: CONTENT"
   */
  async get_hypotheticals() {
    try {
      // Prepare the function call for HyDE Lookup
      const hyde_fx_call = {
        role: "user",
        content: this.content,
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

  /**
   * Parses AI response to extract hypotheticals
   * @param {Object} response - AI response object
   * @returns {Array<string>} Extracted hypotheticals
   */
  parse_hypotheticals(response) {
    return JSON.parse(response.choices[0].message.tool_calls[0].function.arguments || '{}').hypotheticals;
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
}
