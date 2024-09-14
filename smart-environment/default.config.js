import { SmartSources, SmartBlocks, SmartSource, SmartBlock } from 'smart-sources';
import { SmartEmbedModel } from 'smart-embed-model';
export const smart_env_config = {
  env_data_dir: '.smart-env',
  env_path: '/path/to/env',
  collections: {
    smart_sources: SmartSources,
    smart_blocks: SmartBlocks,
  },
  item_types: {
    SmartSource,
    SmartBlock,
  },
  modules: {
    smart_embed_model: {
      class: SmartEmbedModel,
      adapters: { /* requires adding adapter classes here */ }
    },
  }
};