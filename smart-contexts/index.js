import { SmartContexts } from './smart_contexts.js';
import { SmartContext } from './smart_context.js';
import { AjsonSingleFileCollectionDataAdapter } from 'smart-collections/adapters/ajson_single_file.js';

export const smart_contexts_default_config = {
  class: SmartContexts,
  data_adapter: AjsonSingleFileCollectionDataAdapter,
  item_type: SmartContext,
}

export {
  SmartContexts,
  SmartContext,
  smart_contexts_default_config as smart_contexts
};
export default smart_contexts_default_config;