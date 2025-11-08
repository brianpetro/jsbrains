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
        if(!key) {
          const context = completion.env.smart_contexts.new_context();
          completion.data.context_key = context.key;
          return context;
        }
        return completion.env.smart_contexts.get(key);
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
    // compile ephemeral context
    let compiled;
    try {
      compiled = await context.compile();
    } catch(err) {
      console.warn("Error compiling ephemeral context", err);
      return;
    }

    if(compiled.context){
      const content = [
        { type: 'text', text: compiled.context }
      ];
      if(this.completion.data.user_message) {
        content.unshift({ type: 'text', text: this.completion.data.user_message });
      }
      if(compiled.images?.length > 0) {
        content.push(...await this.build_image_content(compiled.images));
      }
      // context at beginning of thread
      this.request.messages.unshift({
        role: 'user',
        content: content
      });
    }
  }
  async build_image_content(image_paths) {
    const content = [];
    if(!Array.isArray(image_paths) || !image_paths.length) return content;
    for(const image_path of image_paths) {
      const base64_image = await convert_image_to_base64(this.env, image_path);
      if(!base64_image) continue;
      content.push({
        type: 'image_url',
        image_url: { url: base64_image }
      });
    }
    return content;
  }
  async build_pdf_content(pdf_paths) {
    const content = [];
    if(!Array.isArray(pdf_paths) || !pdf_paths.length) return content;
    for(const pdf_path of pdf_paths) {
      const base64_pdf = await convert_pdf_to_base64(this.env, pdf_path);
      if(!base64_pdf) continue;
      content.push({
        type: 'file',
        file: {
          filename: pdf_path.split(/[\\/]/).pop(),
          file_data: `data:application/pdf;base64,${base64_pdf}` // <-- Prefix added
        }
      });
    }
    return content;
  }

  /**
   * No special post-processing after we get model response.
   */
  async from_response() { /* no-op */ }

}

async function convert_image_to_base64(env, image_path) {
  if (!image_path) return;
  const fs = env.fs;
  const image_exts = ['png','jpg','jpeg','gif','webp','svg','bmp','ico'];
  const ext = image_path.split('.').pop().toLowerCase();
  if (!image_exts.includes(ext)) return;
  try {
    // read file as base64 from smart_sources fs
    const base64_data = await fs.read(image_path, 'base64');
    const base64_url = `data:image/${ext};base64,${base64_data}`;
    return base64_url;
  } catch (err) {
    console.warn(`Failed to convert image ${image_path} to base64`, err);
  }
}
async function convert_pdf_to_base64(env, pdf_path) {
  const fs = env.fs;
  if (!pdf_path) return;
  const ext = pdf_path.split('.').pop().toLowerCase();
  if (ext !== 'pdf') return;
  try {
    // read file as base64 from smart_sources fs
    const base64_data = await fs.read(pdf_path, 'base64');
    return base64_data;
  } catch (err) {
    console.warn(`Failed to convert PDF ${pdf_path} to base64`, err);
  }
}