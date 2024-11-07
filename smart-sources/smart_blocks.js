import { SmartEntities } from "smart-entities";

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
        name: 'Embed Blocks',
        type: "toggle",
        description: "Embed blocks using the embedding model.",
        default: true,
      },
    });
  }

  /**
   * Retrieves the SmartChange instance from SmartSources.
   * @readonly
   * @returns {SmartChange|undefined} The SmartChange instance or `undefined` if not enabled.
   */
  get smart_change() { return this.env.smart_sources.smart_change; }

  /**
   * Retrieves the SmartSources collection instance.
   * @readonly
   * @returns {SmartSources} The SmartSources collection.
   */
  get source_collection() { return this.env.smart_sources; }

  /**
   * Processes the save queue by delegating to the SmartSources collection.
   * @async
   * @returns {Promise<void>}
   */
  async process_save_queue() {
    await this.source_collection.process_save_queue();
  }

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
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async prune() { throw "Not implemented: prune"; }

  /**
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {void}
   */
  build_links_map() { throw "Not implemented: build_links_map"; }

  /**
   * @async
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async refresh() { throw "Not implemented: refresh"; }

  /**
   * @async
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async search() { throw "Not implemented: search"; }

  /**
   * @async
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async import_file() { throw "Not implemented: import_file"; }

  /**
   * @async
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async run_load() { throw "Not implemented: run_load"; }

  /**
   * @async
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async run_import() { throw "Not implemented: run_import"; }

  /**
   * @async
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async run_refresh() { throw "Not implemented: run_refresh"; }

  /**
   * @async
   * @throws {Error} Throws an error indicating the method is not implemented.
   * @returns {Promise<void>}
   */
  async run_force_refresh() { throw "Not implemented: run_force_refresh"; }
}