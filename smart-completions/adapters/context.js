import { SmartCompletionAdapter } from './_adapter.js';
import { insert_image } from '../utils/insert_image.js';

/**
 * @class SmartCompletionContextAdapter
 * @extends SmartCompletionAdapter
 *
 * This adapter checks `item.data.context` as a single SmartContext key,
 * compiles ephemeral context text, and inserts it as a system message.
 */
export class SmartCompletionContextAdapter extends SmartCompletionAdapter {
  static get property_name() {
    return 'context_key';
  }

  async to_request() {
    const context_key = this.data.context_key;
    if(!context_key) return;
    const context_opts = this.data.context_opts;

    // Single context item only:
    const context_collection = this.item.env.smart_contexts;
    if(!context_collection) {
      console.warn("No 'smart_contexts' collection found; skipping context adapter.");
      return;
    }
    const ctx_item = context_collection.get(context_key);
    if(!ctx_item) {
      console.warn(`SmartContext not found for key '${context_key}'`);
      return;
    }
    if(!ctx_item.has_context_items){
      console.warn(`SmartContext '${context_key}' has no context items; skipping context adapter.`);
      return;
    }
    await ctx_item.save();

    // compile ephemeral context
    let compiled;
    try {
      compiled = await ctx_item.compile(context_opts);
      console.log('compiled', context_key, compiled);
    } catch(err) {
      console.warn("Error compiling ephemeral context", err);
      return;
    }

    if(compiled.context){
      this.insert_user_message(compiled.context, {position: 'start'});
    }
    if(compiled.images.length > 0) {
      await this.insert_images(compiled.images);
    }
    // append user message (again, after the context)
    if(this.data.user_message) {
      this.insert_user_message(this.data.user_message, {position: 'end'});
    }
  }

  async insert_images(image_paths) {
    if(!Array.isArray(image_paths) || !image_paths.length) return;
    for(const img_path of image_paths) {
      console.log('img_path', img_path);
      await insert_image(this.request, img_path, this.item.env.fs);
    }
  }

  /**
   * No special post-processing after we get model response.
   */
  async from_response() { /* no-op */ }

}