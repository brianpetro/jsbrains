import { SmartSources, SmartBlocks, SmartSource, SmartBlock } from 'smart-sources';
import { AjsonMultiFileCollectionDataAdapter } from "smart-collections/adapters/ajson_multi_file";
import { SourceContentAdapter } from "smart-sources/adapters/_adapter.js";
import { MarkdownSourceContentAdapter } from "smart-sources/adapters/markdown_source.js";
import { SmartEmbedModel } from 'smart-embed-model';
export const smart_env_config = {
  env_data_dir: '.smart-env',
  env_path: '/path/to/env',
  collections: {
    smart_sources: { // <--- stable collection_key to override with sub-classes
      class: SmartSources, // may override with import (ex. MySources extends SmartSources)
      data_adapter: AjsonMultiFileCollectionDataAdapter,
      source_adapters: {
        "md": MarkdownSourceContentAdapter,
        "default": SourceContentAdapter,
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