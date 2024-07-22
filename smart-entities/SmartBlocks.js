import { SmartEntities } from "./SmartEntities.js";

export class SmartBlocks extends SmartEntities {
  async import(note) {
    try {
      const { blocks, outlinks } = await this.env.smart_chunks.parse(note);
      note.data.outlinks = outlinks;
      if (!this.env.links) this.env.links = {};
      for (const link_path of note.outlink_paths) {
        if (!this.env.links[link_path]) this.env.links[link_path] = {};
        this.env.links[link_path][note.key] = true;
      }
      blocks.forEach(block => {
        const item = this.create_or_update(block);
        note.last_history.blocks[item.key] = true;
      });
      // const full_block = this.create_or_update({ path: note_path, text: note_content });
      // note.last_history.blocks[full_block.key] = true;
    } catch (e) {
      console.log("error parsing blocks for note: ", note.key);
      console.log(e);
    }
  }
  async prune(override = false) {
    const start = Date.now();
    const remove = [];
    const total_items_w_vec = this.embedded_items.length;
    // console.log("total_items_w_vec: ", total_items_w_vec);
    if (!total_items_w_vec) {
      // DOES NOT clear like in notes
      return; // skip rest if no items with vec
    }
    for (const [key, block] of Object.entries(this.items)) {
      if (block.is_gone) remove.push(key); // remove if expired
    }
    const remove_ratio = remove.length / total_items_w_vec;
    console.log(`Pruning: Found ${remove.length} SmartBlocks in ${Date.now() - start}ms`);
    if ((override && (remove_ratio < 0.5)) || confirm(`Are you sure you want to delete ${remove.length} (${Math.floor(remove_ratio * 100)}%) Block-level embeddings?`)) {
      this.delete_many(remove);
      this.adapter._save_queue();
    }
  }
}
