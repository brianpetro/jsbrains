/**
 * @file cluster_groups.js
 * @description A collection of ClusterGroup items, extends SmartGroups.
 */

import { SmartGroups } from 'smart-groups';
import { ClusterGroup } from './cluster_group.js';

/**
 * @class ClusterGroups
 * @extends SmartGroups
 * @classdesc
 * Manages multiple cluster-group definitions and merges, etc.
 */
export class ClusterGroups extends SmartGroups {
  /**
   * @constructor
   * @param {Object} env - The environment instance.
   * @param {Object} [opts={}] - optional config
   */
  constructor(env, opts = {}) {
    super(env, opts);
  }

  /**
   * Overridden item constructor for cluster groups.
   */
  get item_type() {
    return ClusterGroup;
  }

  /**
   * Could implement advanced logic for merging groups or removing them, reassigning clusters, etc.
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

export default ClusterGroups;
