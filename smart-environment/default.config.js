import { SmartSources, SmartBlocks, SmartSource, SmartBlock } from 'smart-sources';
import { AjsonMultiFileCollectionDataAdapter } from "smart-collections/adapters/ajson_multi_file";
import { SourceAdapter } from "smart-sources/adapters/_adapter.js";
import { MarkdownSourceAdapter } from "smart-sources/adapters/markdown.js";
import { SmartEmbedModel } from 'smart-embed-model';
export const smart_env_config = {
  env_data_dir: '.smart-env',
  env_path: '/path/to/env',
  collections: {
    smart_sources: {
      class: SmartSources,
      data_adapter: AjsonMultiFileCollectionDataAdapter,
      source_adapters: {
        "md": MarkdownSourceAdapter,
        "default": SourceAdapter,
      }
    },
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