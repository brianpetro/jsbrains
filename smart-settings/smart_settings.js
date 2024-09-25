/**
 * Represents settings for the Smart Environment.
 */
export class SmartSettings {
  /**
   * Creates an instance of SmartEnvSettings.
   * @param {Object} main - The main object to contain the instance (smart_settings) and getter (settings)
   * @param {Object} [opts={}] - Configuration options.
   */
  constructor(main, opts = {}) {
    this.main = main;
    this.opts = opts;
    this._fs = null;
    this._settings = {};
    this._saved = false;
    this.save_timeout = null;
  }

  static async create(main, opts = {}) {
    const smart_settings = new this(main, opts);
    await smart_settings.load_settings();
    // add smart_settings to main
    main.smart_settings = smart_settings;
    // add settings getter to main
    Object.defineProperty(main, 'settings', {
      get() { return smart_settings.settings; },
      set(settings) { smart_settings.settings = settings; }
    });
    return smart_settings;
  }
  static create_sync(main, opts = {}) {
    const smart_settings = new this(main, opts);
    smart_settings.load_settings_sync();
    // add smart_settings to main
    main.smart_settings = smart_settings;
    // add settings getter to main
    Object.defineProperty(main, 'settings', {
      get() { return smart_settings.settings; },
      set(settings) { smart_settings.settings = settings; }
    });
    return smart_settings;
  }

  /**
   * Gets the current settings, wrapped with an observer to handle changes.
   * @returns {Proxy} A proxy object that observes changes to the settings.
   */
  get settings() {
    return observe_object(this._settings, (property, value, target) => {
      if(this.save_timeout) clearTimeout(this.save_timeout);
      this.save_timeout = setTimeout(() => {
        this.save_settings(this._settings);
        this.save_timeout = null;
      }, 1000);
    });
  }

  /**
   * Sets the current settings.
   * @param {Object} settings - The new settings to apply.
   */
  set settings(settings) { this._settings = settings; }

  async save_settings(settings=this._settings) {
    if(typeof this.opts.save === 'function') await this.opts.save(settings);
    else await this.main.save_settings(settings);
  }
  async load_settings() {
    if(typeof this.opts.load === 'function') this._settings = await this.opts.load();
    else this._settings = await this.main.load_settings();
  }
  load_settings_sync() {
    if(typeof this.opts.load === 'function') this._settings = this.opts.load();
    else this._settings = this.main.load_settings();
  }

}

/**
 * Creates a proxy object that calls a function when a property is changed.
 * @param {Object} obj - The object to observe.
 * @param {Function} on_change - The function to call when a property is changed.
 * @returns {Proxy} The proxy object that observes changes.
 */
function observe_object(obj, on_change) {
  function create_proxy(target) {
    return new Proxy(target, {
      set(target, property, value) {
        if (target[property] !== value) {
          target[property] = value;
          on_change(property, value, target);
        }
        // If the value being set is an object or array, apply a proxy to it as well
        if (typeof value === 'object' && value !== null) {
          target[property] = create_proxy(value);
        }
        return true;
      },
      get(target, property) {
        const result = target[property];
        // If a property is an object or array, apply a proxy to it
        if (typeof result === 'object' && result !== null) {
          return create_proxy(result);
        }
        return result;
      },
      deleteProperty(target, property) {
        if (property in target) {
          delete target[property];
          on_change(property, undefined, target); // Notify the deletion, value is undefined
        }
        return true;
      }
    });
  }

  return create_proxy(obj);
}