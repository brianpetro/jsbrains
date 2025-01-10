/**
 * @file clusters.js
 * @description Collection of Cluster items, extends SmartEntities.
 */

import { SmartEntities } from 'smart-entities';
import { Cluster } from './cluster.js';

/**
 * @class Clusters
 * @extends SmartEntities
 * @classdesc
 * A collection of `Cluster` items. Manages creation, updates, and embedding logic if needed.
 */
export class Clusters extends SmartEntities {
  /**
   * @constructor
   * @param {Object} env - The environment instance.
   * @param {Object} [opts={}] - Configuration options.
   */
  constructor(env, opts = {}) {
    super(env, opts);
  }

  /**
   * Returns the item constructor for clusters.
   * @returns {Function} The Cluster class
   */
  get item_type() {
    return Cluster;
  }

  /**
   * Example override or extension point if needed
   */
  async init() {
    await super.init();
  }
  get embed_model() {
    // use sources embed_model
    return this.env.smart_sources.embed_model;
  }
  set embed_model(model) {
    // do nothing
  }
}

export default Clusters;
