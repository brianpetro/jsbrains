import {
  SmartEntities,
  settings_config as entities_settings_config
} from "smart-entities/smart_entities.js";

/**
 * @class SmartBlocks
 * @extends SmartEntities
 * @classdesc Manages a collection of SmartBlock entities, providing embedding and utility functions specific to blocks.
 */
export class SmartBlocks extends SmartEntities {
  /**
   * Initializes the SmartBlocks instance. Currently muted as processing is handled by SmartSources.
   * @returns {void}
   */
  init() { /* mute */ }

  get fs() { return this.env.smart_sources.fs; }

  /**
   * Retrieves the embedding model associated with the SmartSources collection.
   * @readonly
   * @returns {Object|undefined} The embedding model instance or `undefined` if not set.
   */
  get embed_model() { return this.source_collection?.embed_model; }

  /**
   * Retrieves the embedding model key from the SmartSources collection.
   * @readonly
   * @returns {string|undefined} The embedding model key or `undefined` if not set.
   */
  get embed_model_key() { return this.source_collection?.embed_model_key; }

  /**
   * Calculates the expected number of blocks based on the SmartSources collection.
   * @readonly
   * @returns {number} The expected count of blocks.
   */
  get expected_blocks_ct() { return Object.values(this.source_collection.items).reduce((acc, item) => acc += Object.keys(item.data.blocks || {}).length, 0); }

  /**
   * Retrieves the notices system from the environment.
   * @readonly
   * @returns {Object} The notices object.
   */
  get notices() { return this.env.smart_connections_plugin?.notices || this.env.main?.notices; }

  /**
   * Retrieves the settings configuration for SmartBlocks.
   * @readonly
   * @returns {Object} The settings configuration object.
   */
  get settings_config() {
    return this.process_settings_config({
      "embed_blocks": {
        name: 'Embed blocks',
        type: "toggle",
        description: "Blocks represent parts/sections of notes. Get more granular results.",
        default: true,
      },
      ...super.settings_config,
    });
  }
  render_settings(container, opts = {}) {
    return this.render_collection_settings(container, opts);
  }
  get data_dir() { return 'multi'; }

  /**
   * Retrieves the SmartSources collection instance.
   * @readonly
   * @returns {SmartSources} The SmartSources collection.
   */
  get source_collection() { return this.env.smart_sources; }

  /**
   * Processes the embed queue. Currently handled by SmartSources, so this method is muted.
   * @async
   * @returns {Promise<void>}
   */
  async process_embed_queue() {
    // await this.source_collection.process_embed_queue();
  }

  /**
   * Processes the load queue. Currently muted as processing is handled by SmartSources.
   * @async
   * @returns {Promise<void>}
   */
  async process_load_queue() { /* mute */ }

  // TEMP: Methods in sources not implemented in blocks

  /**
   * @async
   * @abstract
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async prune() { throw "Not implemented: prune"; }

  /**
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @abstract
   * @returns {void}
   */
  build_links_map() { throw "Not implemented: build_links_map"; }

  /**
   * @async
   * @abstract
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async refresh() { throw "Not implemented: refresh"; }

  /**
   * @async
   * @abstract
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async search() { throw "Not implemented: search"; }


  /**
   * @async
   * @abstract
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async run_refresh() { throw "Not implemented: run_refresh"; }

  /**
   * @async
   * @abstract
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async run_force_refresh() { throw "Not implemented: run_force_refresh"; }

  // clear expired blocks
  // TODO/future: replaced by storing block data within source data
  async cleanup_blocks() {
    const expired_blocks = Object.values(this.items)
      .filter(i => i.is_gone)
    ;
    console.log(`Removing ${expired_blocks.length} expired blocks`);
    expired_blocks
      .forEach(i => i.delete())
    ;
    await this.process_save_queue();
    expired_blocks.forEach(i => {
      delete this.items[i.key]; // remove from items
    });
    this.emit_event('blocks:cleaned', {expired_blocks_ct: expired_blocks.length});
  }
}


export const settings_config = (scope) => {
  const config = {
    "embed_blocks": {
      name: 'Embed blocks',
      type: "toggle",
      description: "Blocks represent parts/sections of notes. Get more granular results.",
      default: true,
    },
    ...entities_settings_config,
  };
  if (scope.settings.embed_blocks === false && config.min_chars) {
    config.min_chars.disabled = true;
  }
  return config;
};


export default {
  class: SmartBlocks,
  collection_key: 'smart_blocks',
  settings_config,
};