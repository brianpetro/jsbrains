import { SmartEntities } from "smart-entities";

export class SmartBlocks extends SmartEntities {
  get block_adapters() {
    return {
      ...(this.env.opts.collections?.[this.collection_key]?.block_adapters || {}),
      ...(this.opts.block_adapters || {}),
    };
  }
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

  // handled by sources
  async process_save_queue() {
    await this.env.smart_sources.process_save_queue();
  }
  get settings_config() {
    return this.process_settings_config({
      "embed_blocks": {
        name: 'Embed Blocks',
        type: "toggle",
        description: "Embed blocks using the embedding model.",
        default: true,
      },
    });
  }
  // get settings_config() {
  //   return {
  //     ...super.settings_config,
  //     // Merge block adapters' settings_config
  //     ...Object.values(this.block_adapters).reduce((acc, adapter) => {
  //       if(adapter.settings_config){
  //         acc = { ...acc, ...adapter.settings_config };
  //       }
  //       return acc;
  //     }, {}),
  //     "smart_blocks.embed_model.model_key": {
  //       name: 'Embedding Model',
  //       type: "dropdown",
  //       description: "Select an embedding model.",
  //       options_callback: 'smart_blocks.embed_model.get_block_embedding_model_options',
  //       callback: 'smart_blocks.embed_model_changed',
  //       // required: true
  //       default: 'TaylorAI/bge-micro-v2',
  //     },
  //   };
  // }
}