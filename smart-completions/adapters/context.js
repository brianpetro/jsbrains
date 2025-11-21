import { SmartCompletionAdapter } from './_adapter.js';

/**
 * @class ContextCompletionAdapter
 * @extends SmartCompletionAdapter
 */
export class ContextCompletionAdapter extends SmartCompletionAdapter {
  static order = 10;
  static get property_name() {
    return 'context_key';
  }
  static item_constructor(completion){
    Object.defineProperty(completion, 'context', {
      get(){
        const key = completion.data.context_key;
        const smart_contexts = completion.env.smart_contexts;
        let context = smart_contexts.get(key);
        if (!key || !context) {
          context = smart_contexts.new_context();
          completion.data.context_key = context.key;
        }
        return context;
      }
    });
  }

  async to_request() {
    const chat_thread = this.completion.chat_thread;
    const context = this.completion.context;
    if(!context) {
      console.warn(`[ContextCompletionAdapter] context not found for completion key '${this.completion.key}'; skipping context adapter.`);
      return;
    }
    if(!context.has_context_items){
      console.warn(`[ContextCompletionAdapter] Context '${context.key}' has no context items; skipping context adapter.`);
      return;
    }
    if(chat_thread) {
      // include context only once in most recent completion
      if(chat_thread.current_completion.key !== this.completion.key) return; // not the most recent completion
    }
    const text = await context.get_text();
    const content = [{ type: 'text', text }];
    if(this.completion.data.user_message) {
      content.unshift({ type: 'text', text: this.completion.data.user_message });
    }
    const media = await context.get_media();
    for(const item_base64 of media) {
      if(item_base64.type === 'image_url') {
        content.push({
          type: 'image_url',
          image_url: { url: item_base64.url }
        });
      }
      else if(item_base64.type === 'pdf_url') {
        content.push({
          type: 'file',
          file: {
            filename: item_base64.name,
            file_data: item_base64.url
          }
        });
      }
    }

    // context at beginning of thread
    this.request.messages.unshift({
      role: 'user',
      content: content
    });
  }

  /**
   * No special post-processing after we get model response.
   */
  async from_response() { /* no-op */ }

}
