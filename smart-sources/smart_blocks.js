import { SmartEntities } from "smart-entities";

export class SmartBlocks extends SmartEntities {
  init() { /* mute */ }

  async create(key, content) {
    if(!content) content = "-"; // default to a single dash (prevent block being ignored by parser)
    const source_key = key.split("#")[0];
    let source = this.source_collection.get(source_key);
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

  get embed_model() { return this.source_collection?.embed_model; }
  get embed_model_key() { return this.source_collection?.embed_model_key; }
  get expected_blocks_ct() { return Object.values(this.source_collection.items).reduce((acc, item) => acc += Object.keys(item.data.blocks || {}).length, 0); }
  get notices() { return this.env.smart_connections_plugin?.notices || this.env.main?.notices; }
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
  get smart_change() { return this.env.smart_sources.smart_change; }
  get source_collection() { return this.env.smart_sources; }
  // handled by sources
  async process_save_queue() {
    await this.source_collection.process_save_queue();
  }
  async process_embed_queue() {
    // await this.source_collection.process_embed_queue();
  }
  async process_load_queue() { /* mute */ }

  // TEMP: methods in sources not implemented in blocks
  async prune() { throw "Not implemented: prune"; }
  build_links_map() { throw "Not implemented: build_links_map"; }
  async refresh() { throw "Not implemented: refresh"; }
  async search() { throw "Not implemented: search"; }
  async import_file() { throw "Not implemented: import_file"; }
  async run_load() { throw "Not implemented: run_load"; }
  async run_import() { throw "Not implemented: run_import"; }
  async run_refresh() { throw "Not implemented: run_refresh"; }
  async run_force_refresh() { throw "Not implemented: run_force_refresh"; }
}