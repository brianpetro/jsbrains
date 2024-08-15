import { create_hash } from "./create_hash.js";
import { SmartEntities } from "./SmartEntities.js";

// DO: Extract to separate files
export class SmartSources extends SmartEntities {
  async import(source_files) {
    if(!source_files?.length) source_files = await this.fs.list_files_recursive();
    source_files = source_files.filter(file => ['.md', '.canvas', '.txt'].includes(file.extension)); // filter available file types
    let batch = [];
    try {
      const timeoutDuration = 10000; // Timeout duration in milliseconds (e.g., 10000 ms for 10 seconds)
      let i = 0;
      for (i = 0; i < source_files.length; i++) {
        const file = source_files[i];
        if (typeof file.stat?.size !== 'number') console.warn("Unexpected source_file instance: file size is not a number: ", file);
        if (file.stat.size > 1000000) {
          console.log(`Smart Connections: Skipping large file: ${file.path}`);
          continue;
        }
        if (batch.length % 10 === 0) {
          this.env.main.notices.show('initial scan progress', [`Making Smart Connections...`, `Progress: ${i} / ${source_files.length} files`], { timeout: 0 });
          // Promise.race to handle timeout
          const batchPromise = Promise.all(batch);
          const timeoutPromise = new Promise((resolve, reject) => {
            setTimeout(() => {
              reject(new Error('Batch processing timed out'));
            }, timeoutDuration);
          });
          try {
            await Promise.race([batchPromise, timeoutPromise]);
          } catch (error) {
            console.error('Batch processing error:', error);
            // log files paths that were in batch via files
            const files_in_batch = source_files.slice(i - batch.length, i);
            console.log(`Smart Connections: Batch processing error: ${JSON.stringify(files_in_batch.map(file => file.path), null, 2)}`);
          }
          batch = [];
        }
        const note = this.get(file.path);
        if (!note) batch.push(this.create_or_update({ path: file.path }));
        else {
          if (note.meta_changed) {
            note.data.embeddings = {};
            batch.push(this.create_or_update({ path: file.path }));
          }
        }
      }

      // Final batch processing outside the loop
      if (batch.length > 0) {
        this.env.main.notices.show('initial scan progress', [`Making Smart Connections...`, `Progress: ${i} / ${source_files.length} files`], { timeout: 0 });
        const batchPromise = Promise.all(batch);
        const timeoutPromise = new Promise((resolve, reject) => {
          setTimeout(() => {
            reject(new Error('Final batch processing timed out'));
          }, timeoutDuration);
        });

        try {
          await Promise.race([batchPromise, timeoutPromise]);
        } catch (error) {
          console.error('Final batch processing error:', error);
        }
      }
      this.env.links = this.build_links_map();
      this.env.main.notices.remove('initial scan progress');
      if(source_files.length > 1) this.env.main.notices.show('done initial scan', [`Making Smart Connections...`, `Completed initial scan.`], { timeout: 3000 });
    } catch (e) {
      console.warn("error importing notes: ", e);
      console.warn({ batch });
    }
  }
  async prune() {
    const start = Date.now();
    const remove = [];
    const items_w_vec = Object.entries(this.items).filter(([key, note]) => note.vec);
    const total_items_w_vec = items_w_vec.length;
    const available_notes = (await this.fs.list_files_recursive('/')).reduce((acc, file) => {
      acc[file.path] = true;
      return acc;
    }, {});
    if (!total_items_w_vec) {
      this.clear(); // clear if no items with vec (rebuilds in import)
      return; // skip rest if no items with vec
    }
    for (const [key, note] of items_w_vec) {
      Object.entries(note.data.embeddings).forEach(([model, embedding]) => {
        // only keep active model embeddings
        if(model !== note.embed_model){
          note.data.embeddings[model] = null;
          note.queue_save();
        }
      });
      if (!available_notes[note.data.path]) {
        remove.push(key); // remove if not available
        continue;
      }
      if (note.is_gone) {
        remove.push(key); // remove if expired
        continue;
      }
      if (note.meta_changed) {
        const content = await note.get_content();
        const hash = await create_hash(content);
        if (hash !== note.last_history?.hash) {
          remove.push(key); // remove if changed
          continue;
        }
      }
    }
    const remove_ratio = remove.length / total_items_w_vec;
    console.log(`Smart Connections: Pruning: Found ${remove.length} Smart Notes to remove in ${Date.now() - start}ms`);
    if (remove_ratio < 0.5 || confirm(`Are you sure you want to delete ${remove.length} (${Math.floor(remove_ratio * 100)}%) Note-level Embeddings?`)) {
      this.delete_many(remove);
    }
    await this.env.smart_blocks.prune();
    this.env.save();
  }
  get current_note() { return this.get(this.env.main.app.workspace.getActiveFile().path); }
  build_links_map() {
    const links_map = {};
    for (const source of Object.values(this.items)) {
      for (const link of source.outlink_paths) {
        if (!links_map[link]) links_map[link] = {};
        links_map[link][source.key] = true;
      }
    }
    return links_map;
  }
  async refresh_embeddings() {
    await this.prune();
    for (const source of Object.values(this.items)) {
      if(source.excluded) continue;
      if (source.is_unembedded) source.smart_embed.embed_entity(source);
      else if (this.env.smart_blocks.smart_embed) {
        source.blocks.forEach(block => {
          if (block.is_unembedded) block.smart_embed.embed_entity(block);
        });
      }
    }
  }
  // CRUD
  async create(key, content) {
    await this.env.fs.write(key, content);
    const source = await this.create_or_update({ path: key });
    return source;
  }
}
