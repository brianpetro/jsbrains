import { SmartEntities } from "./SmartEntities.js";

export class SmartBlocks extends SmartEntities {
  async prune() {
    const start = Date.now();
    const remove = [];
    const items = Object.entries(this.items);
    for (let i = 0; i < items.length; i++) {
      const [key, block] = items[i];
      if (block.is_gone) remove.push(key); // remove if expired
    }
    const remove_ratio = remove.length / items.length;
    console.log(`Smart Connections: Pruning: Found ${remove.length} Smart Blocks to remove in ${Date.now() - start}ms`);
    if (remove_ratio < 0.5 || confirm(`Are you sure you want to delete ${remove.length} (${Math.floor(remove_ratio * 100)}%) Block-level embeddings?`)) {
      this.delete_many(remove);
    }
  }
}
