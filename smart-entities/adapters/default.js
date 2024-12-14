/**
 * @file default.js
 * @description Default vector adapters for SmartEntities and SmartCollections
 * Implements in-memory vector logic using the entity's `data.embeddings`.
 * Uses cosine similarity for nearest/furthest queries.
 */

import { EntitiesVectorAdapter, EntityVectorAdapter } from "./_adapter.js";
import { cos_sim } from "../cos_sim.js";
import { results_acc, furthest_acc } from "../top_acc.js";

/**
 * @class DefaultEntitiesVectorAdapter
 * @extends EntitiesVectorAdapter
 * @classdesc
 * Implements an in-memory vector store using entity data.
 * Stores embeddings in the item's `data.embeddings` keyed by `embed_model_key`.
 * Supports nearest/furthest queries and batch embedding via the collection's embed_model.
 */
export class DefaultEntitiesVectorAdapter extends EntitiesVectorAdapter {
  /**
   * Find the nearest entities to the given vector.
   * @async
   * @param {number[]} vec - The reference vector.
   * @param {Object} [filter={}] - Optional filters (limit, exclude, etc.)
   * @returns {Promise<Array<{item:Object, score:number}>>} Array of results sorted by score descending.
   */
  async nearest(vec, filter = {}) {
    if (!vec || !Array.isArray(vec)) {
      throw new Error("Invalid vector input to nearest()");
    }
    const { limit = 50 } = filter;
    const items = Object.values(this.collection.items).filter(item => item.vec);
    const acc = { min: 0, results: new Set(), minResult: null };
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const score = cos_sim(vec, item.vec);
      const result = { item, score };
      results_acc(acc, result, limit);
    }
    return Array.from(acc.results).sort((a,b) => b.score - a.score);
  }

  /**
   * Find the furthest entities from the given vector.
   * @async
   * @param {number[]} vec - The reference vector.
   * @param {Object} [filter={}] - Optional filters (limit, exclude, etc.)
   * @returns {Promise<Array<{item:Object, score:number}>>} Array of results sorted by score ascending (furthest).
   */
  async furthest(vec, filter = {}) {
    if (!vec || !Array.isArray(vec)) {
      throw new Error("Invalid vector input to furthest()");
    }
    const { limit = 50 } = filter;
    const items = Object.values(this.collection.items).filter(item => item.vec);
    const acc = { max: 1, results: new Set(), maxResult: null };
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const score = cos_sim(vec, item.vec);
      const result = { item, score };
      furthest_acc(acc, result, limit);
    }
    const results = Array.from(acc.results);
    // sort ascending by score for furthest
    return results.sort((a,b) => a.score - b.score);
  }

  /**
   * Embed a batch of entities.
   * @async
   * @param {Object[]} entities - Array of entity instances to embed.
   * @returns {Promise<void>}
   */
  async embed_batch(entities) {
    if (!this.collection.embed_model) {
      throw new Error('No embed_model found in collection for embedding');
    }
    // Prepare input and get embeddings from the model
    // Assuming each entity has a get_embed_input() method that sets `entity._embed_input`
    await Promise.all(entities.map(e => e.get_embed_input()));
    const embeddings = await this.collection.embed_model.embed_batch(entities);
    // Assign embeddings to entities
    embeddings.forEach((emb, i) => {
      const entity = entities[i];
      entity.vec = emb.vec;
      if (emb.tokens !== undefined) entity.tokens = emb.tokens;
    });
  }

  /**
   * Process a queue of entities waiting to be embedded.
   * Typically, this will call embed_batch in batches and update entities.
   * @async
   * @param {Object[]} embed_queue - Array of entities to embed.
   * @returns {Promise<void>}
   */
  async process_embed_queue(embed_queue) {
    // Default implementation: Just embed all at once
    // In practice, you may batch this as needed.
    await this.embed_batch(embed_queue);
  }
}


/**
 * @class DefaultEntityVectorAdapter
 * @extends EntityVectorAdapter
 * @classdesc
 * In-memory adapter for a single entity. Stores and retrieves vectors from item.data.
 */
export class DefaultEntityVectorAdapter extends EntityVectorAdapter {
  /**
   * Retrieve the current vector embedding for this entity.
   * @async
   * @returns {Promise<number[]|undefined>} The entity's vector or undefined if not set.
   */
  async get_vec() {
    return this.item.data?.embeddings?.[this.item.embed_model_key]?.vec;
  }

  /**
   * Store/update the vector embedding for this entity.
   * @async
   * @param {number[]} vec - The vector to set.
   * @returns {Promise<void>}
   */
  async set_vec(vec) {
    if (!this.item.data.embeddings) {
      this.item.data.embeddings = {};
    }
    if (!this.item.data.embeddings[this.item.embed_model_key]) {
      this.item.data.embeddings[this.item.embed_model_key] = {};
    }
    this.item.data.embeddings[this.item.embed_model_key].vec = vec;
  }

  /**
   * Delete/remove the vector embedding for this entity.
   * @async
   * @returns {Promise<void>}
   */
  async delete_vec() {
    if (this.item.data?.embeddings?.[this.item.embed_model_key]) {
      delete this.item.data.embeddings[this.item.embed_model_key].vec;
    }
  }
}
