import { SmartContexts } from './smart_contexts.js';
import { SmartContext } from './smart_context.js';
import { AjsonSingleFileCollectionDataAdapter } from 'smart-collections/adapters/ajson_single_file.js';
import { DefaultContextCompileAdapter } from './adapters/default.js';

export const smart_contexts_default_config = {
  class: SmartContexts,
  data_adapter: AjsonSingleFileCollectionDataAdapter,
  compile_adapters: {
    DefaultContextCompileAdapter,
  }
}

export {
  SmartContexts,
  SmartContext,
  smart_contexts_default_config as smart_contexts
};