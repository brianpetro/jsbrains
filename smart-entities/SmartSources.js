import { create_hash } from "./create_hash.js";
import { SmartEntities } from "./SmartEntities.js";

// DO: Extract to separate files
export class SmartSources extends SmartEntities {
  async import(files = [], opts = {}) {
    let batch = [];
    try {
      const timeoutDuration = 10000; // Timeout duration in milliseconds (e.g., 10000 ms for 10 seconds)
      let i = 0;
      for (i = 0; i < files.length; i++) {
        // if file size greater than 1MB skip
        if (files[i].stat.size > 1000000) {
          console.log("skipping large file: ", files[i].path);
          continue;
        }
        if (batch.length % 10 === 0) {
          this.env.main.notices.show('initial scan progress', [`Making Smart Connections...`, `Progress: ${i} / ${files.length} files`], { timeout: 0 });
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
            const files_in_batch = files.slice(i - batch.length, i);
            console.log(files_in_batch.map(file => file.path));
            // Handle timeout or other errors here
          }
          batch = [];
        }
        const note = this.get(files[i].path);
        if (!note) batch.push(this.create_or_update({ path: files[i].path }));
        else {
          if (note.meta_changed) {
            console.log("note meta changed: ", note);
            note.data.embeddings = {};
            batch.push(this.create_or_update({ path: files[i].path }));
          } else if (this.env.smart_blocks?.smart_embed) {
            batch.push(this.env.smart_blocks.import(note, { show_notice: false }));
          }
        }
      }

      // Final batch processing outside the loop
      if (batch.length > 0) {
        this.env.main.notices.show('initial scan progress', [`Making Smart Connections...`, `Progress: ${i} / ${files.length} files`], { timeout: 0 });
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

      this.env.main.notices.remove('initial scan progress');
      this.env.main.notices.show('done initial scan', [`Making Smart Connections...`, `Done importing Smart Notes.`], { timeout: 3000 });
      this.ensure_embeddings();
    } catch (e) {
      console.warn("error importing notes: ", e);
      console.warn({ batch });
    }
  }
  async ensure_embeddings(show_notice = false) {
    await super.ensure_embeddings(show_notice);
    await this.prune(true);
    if (this.env.smart_blocks?.smart_embed) {
      await this.env.smart_blocks.ensure_embeddings({ show_notice }); // trigger block-level import
      await this.env.smart_blocks.prune(true);
    }
  }
  async prune(override = false) {
    const start = Date.now();
    const remove = [];
    const items_w_vec = Object.entries(this.items).filter(([key, note]) => note.vec);
    const total_items_w_vec = items_w_vec.length;
    const available_notes = this.env.files.reduce((acc, file) => {
      acc[file.path] = true;
      return acc;
    }, {});
    if (!total_items_w_vec) {
      this.clear(); // clear if no items with vec (rebuilds in import)
      return; // skip rest if no items with vec
    }
    for (const [key, note] of items_w_vec) {
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
    console.log(remove);
    const remove_ratio = remove.length / total_items_w_vec;
    console.log(`Pruning: Found ${remove.length} Smart Notes in ${Date.now() - start}ms`);
    if ((override && (remove_ratio < 0.5)) || confirm(`Are you sure you want to delete ${remove.length} (${Math.floor(remove_ratio * 100)}%) Note-level Embeddings?`)) {
      this.delete_many(remove);
      this.adapter._save_queue();
    }
  }
  get current_note() { return this.get(this.env.main.app.workspace.getActiveFile().path); }
  get blocks() { this.env.smart_blocks.get_many(this.last_history.blocks); }
}
