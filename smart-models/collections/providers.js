import { Collection } from 'smart-collections/collection.js';
import ajson_single_file_data_adapter from 'smart-collections/adapters/ajson_single_file.js';
import { Provider } from '../items/provider.js';

export class Providers extends Collection {
  new_provider(data = {}) {
    if(!data.adapter_key) throw new Error('adapter_key is required to create a new provider');
    const item = new this.item_type(this.env, {
      ...data,
    });
    this.set(item);
    item.queue_save();
    item.emit_event('provider:created');
    return item;
  }
}

export const providers_collection = {
  class: Providers,
  data_dir: 'providers',
  data_adapter: ajson_single_file_data_adapter,
  item_type: Provider,
  provider_adapters: {
    // anthropic,
    // cohere,
    // deepseek,
    // google,
    // groq,
    // lmstudio,
    // openrouter,
    // openai,
    // transformers,
    // xai,
  }
};

export default providers_collection;
