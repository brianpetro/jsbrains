import { SmartEntities } from "smart-entities";

export class SmartBlocks extends SmartEntities {
  async prune() {
    const start = Date.now();
    const remove = [];
    const items = Object.entries(this.items);
    for (let i = 0; i < items.length; i++) {
      const [key, block] = items[i];
      Object.entries(block.data.embeddings).forEach(([model, embedding]) => {
        // only keep active model embeddings
        if(model !== block.embed_model){
          block.data.embeddings[model] = null;
          block.queue_save();
        }
      });
      if (block.is_gone) remove.push(key); // remove if expired
    }
    const remove_ratio = remove.length / items.length;
    console.log(`Smart Connections: Pruning: Found ${remove.length} Smart Blocks to remove in ${Date.now() - start}ms`);
    if (remove_ratio < 0.5 || confirm(`Are you sure you want to delete ${remove.length} (${Math.floor(remove_ratio * 100)}%) Block-level embeddings?`)) {
      this.delete_many(remove);
    }
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
    await source.parse_content();
    const block = this.get(key);
    return block;
  }
}
