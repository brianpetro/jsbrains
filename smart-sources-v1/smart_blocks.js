import { SmartSources } from "./smart_sources.js";

export class SmartBlocks extends SmartSources {
  get block_adapters() {
    return {
      ...(this.env.opts.collections?.[this.collection_key]?.block_adapters || {}),
      ...(this.opts.block_adapters || {}),
    };
  }
  init() {}
  get source_collection() { return this.env.smart_sources; }
  get embed_model() { return this.source_collection?.embed_model; }
  get embed_model_key() { return this.source_collection?.embed_model_key; }
  async create(key, content) {
    if(!content) content = "-"; // default to a single dash (prevent block being ignored by parser)
    const source_key = key.split("#")[0];
    let source = this.env.smart_sources.get(source_key);
    const headings = key.split("#").slice(1);
    const content_with_all_headings = [
      ...headings.map((heading, i) => `${"#".repeat(i + 1)} ${heading}`),
      ...content.split("\n")
    ]
    // remove back-to-back duplicates
    .filter((heading, i, arr) => heading !== arr[i-1])
    .join("\n");
    if(!source) {
      source = await this.env.smart_sources.create(source_key, content_with_all_headings);
    }else{
      await source.update(content_with_all_headings, { mode: 'merge_append' });
    }
    await source.import();
    const block = this.get(key);
    return block;
  }

  get smart_change() { return this.env.smart_sources.smart_change; }
  get settings_config() {
    return {
      embed_blocks: {
        name: 'Block Embeddings',
        type: "toggle",
        description: "Splits notes into blocks (excerpts) for more granular embeddings.",
        default: true,
      },
      // ...super.settings_config,
      // "embed_model.model_key": {
      //   name: 'Embedding Model',
      //   type: "dropdown",
      //   description: "Select an embedding model.",
      //   options_callback: 'embed_model.get_block_embedding_model_options',
      //   callback: 'embed_model_changed',
      //   // required: true
      //   default: 'TaylorAI/bge-micro-v2',
      // },
    };
  }
  // handled by sources
  async process_save_queue() {
    await this.source_collection.process_save_queue();
  }
  async process_embed_queue() {
    await this.source_collection.process_embed_queue();
  }
  async process_load_queue() {
    // await this.source_collection.process_load_queue();
  }
}