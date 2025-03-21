import { SmartFs } from 'smart-file-system';
import { SmartFsObsidianAdapter } from 'smart-file-system/adapters/obsidian.js';
import { SmartView } from 'smart-view';
import { SmartViewObsidianAdapter } from 'smart-view/adapters/obsidian.js';
import { SmartSources, SmartSource } from 'smart-sources';
import { AjsonMultiFileSourcesDataAdapter } from "smart-sources/adapters/data/ajson_multi_file.js";
import { ObsidianMarkdownSourceContentAdapter } from "smart-sources/adapters/obsidian_markdown.js";
import { SmartBlocks, SmartBlock } from 'smart-blocks';
import { AjsonMultiFileBlocksDataAdapter } from "smart-blocks/adapters/data/ajson_multi_file.js";
import { MarkdownBlockContentAdapter } from "smart-blocks/adapters/markdown_block.js";
import { Notice } from 'obsidian';
import { SmartNotices } from "smart-notices/smart_notices.js"; // TODO: move to jsbrains
// actions architecture
import smart_block from "smart-blocks/smart_block.js";
import smart_source from "smart-sources/smart_source.js";
import { parse_blocks } from "smart-blocks/content_parsers/parse_blocks.js";
export default {
  env_path: '',
  modules: {
    smart_fs: {
      class: SmartFs,
      adapter: SmartFsObsidianAdapter,
    },
    smart_view: {
      class: SmartView,
      adapter: SmartViewObsidianAdapter,
    },
    smart_notices: {
      class: SmartNotices,
      adapter: Notice,
    },
  },
  collections: {
    smart_sources: {
      collection_key: 'smart_sources',
      class: SmartSources,
      data_adapter: AjsonMultiFileSourcesDataAdapter,
      source_adapters: {
        "md": ObsidianMarkdownSourceContentAdapter,
        "txt": ObsidianMarkdownSourceContentAdapter,
        // "canvas": MarkdownSourceContentAdapter,
        // "default": MarkdownSourceContentAdapter,
      },
      content_parsers: [
        parse_blocks,
      ],
      process_embed_queue: false,
    },
    smart_blocks: {
      collection_key: 'smart_blocks',
      class: SmartBlocks,
      data_adapter: AjsonMultiFileBlocksDataAdapter,
      block_adapters: {
        "md": MarkdownBlockContentAdapter,
        "txt": MarkdownBlockContentAdapter,
        // "canvas": MarkdownBlockContentAdapter,
      },
    },
  },
  item_types: {
    SmartSource,
    SmartBlock,
  },
  items: {
    smart_source,
    smart_block,
  },
  default_settings: {
    is_obsidian_vault: true,
    smart_blocks: {
      embed_blocks: true,
      min_chars: 200,
    },
    smart_sources: {
      min_chars: 200,
      embed_model: {
        adapter: "transformers",
        transformers: {
          legacy_transformers: false,
          model_key: 'TaylorAI/bge-micro-v2',
        },
      },
    },
    file_exclusions: 'Untitled',
    folder_exclusions: 'smart-chats',
    smart_view_filter: {
      render_markdown: true,
      show_full_path: false,
    },
  },
};