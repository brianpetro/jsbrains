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
    this.save_delay_ms = typeof opts.save_delay_ms === 'number' ? opts.save_delay_ms : 1000;
  }

  static async create(main, opts = {}) {
    const smart_settings = new this(main, opts);
    await smart_settings.load();
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
    smart_settings.load_sync();
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
    return observe_object(this._settings, (change) => {
      this.emit_settings_changed(change);
      this.schedule_save();
    });
  }

  /**
   * Sets the current settings.
   * @param {Object} settings - The new settings to apply.
   */
  set settings(settings) { this._settings = settings; }

  schedule_save() {
    if (this.save_timeout) clearTimeout(this.save_timeout);
    this.save_timeout = setTimeout(() => {
      this.save(this._settings);
      this.save_timeout = null;
    }, this.save_delay_ms);
  }

  emit_settings_changed(change) {
    const events_bus = this.resolve_events_bus();
    if (!events_bus?.emit) return;
    events_bus.emit('settings:changed', build_settings_changed_event(change));
  }

  resolve_events_bus() {
    if (this.opts.events) return this.opts.events;
    if (typeof this.opts.emit === 'function') {
      return { emit: this.opts.emit };
    }
    if (this.main?.events) return this.main.events;
    if (this.main?.env?.events) return this.main.env.events;
    return null;
  }

  async save(settings=this._settings) {
    if(typeof this.opts.save === 'function') await this.opts.save(settings);
    else await this.main.save_settings(settings);
  }
  async load() {
    if(typeof this.opts.load === 'function') this._settings = await this.opts.load();
    else this._settings = await this.main.load_settings();
  }
  load_sync() {
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
  const proxy_cache = new WeakMap();
  const proxy_targets = new WeakMap();

  const wrap_value = (value, path) => {
    if (!is_observable(value)) return value;
    if (proxy_targets.has(value)) return value;
    if (proxy_cache.has(value)) return proxy_cache.get(value);
    const proxy = create_proxy(value, path);
    proxy_cache.set(value, proxy);
    proxy_targets.set(proxy, value);
    return proxy;
  };

  const create_proxy = (target, path) => new Proxy(target, {
    set(target, property, value) {
      const property_path = [...path, property];
      const previous_snapshot = snapshot_value(target[property]);
      const next_snapshot = snapshot_value(value);
      target[property] = wrap_value(value, property_path);
      if (has_changed(previous_snapshot, next_snapshot)) {
        on_change({
          type: 'set',
          path: property_path,
          value: next_snapshot,
          previous_value: previous_snapshot
        });
      }
      return true;
    },
    get(target, property) {
      const result = target[property];
      return wrap_value(result, [...path, property]);
    },
    deleteProperty(target, property) {
      if (!Object.prototype.hasOwnProperty.call(target, property)) {
        return true;
      }
      const property_path = [...path, property];
      const previous_snapshot = snapshot_value(target[property]);
      delete target[property];
      on_change({
        type: 'delete',
        path: property_path,
        previous_value: previous_snapshot
      });
      return true;
    }
  });

  return wrap_value(obj, []);
}

function build_settings_changed_event(change) {
  const path = Array.isArray(change.path) ? change.path : [];
  return {
    type: change.type,
    path,
    path_string: path.join('.'),
    value: change.value,
    previous_value: change.previous_value
  };
}

function snapshot_value(value) {
  if (!is_observable(value)) {
    return value;
  }
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // fall back to JSON clone below
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function has_changed(previous_snapshot, next_snapshot) {
  return serialize_value(previous_snapshot) !== serialize_value(next_snapshot);
}

function serialize_value(value) {
  if (value === undefined) return 'undefined';
  if (Number.isNaN(value)) return 'number:NaN';
  if (value === Infinity) return 'number:Infinity';
  if (value === -Infinity) return 'number:-Infinity';
  if (!is_observable(value)) {
    return `${typeof value}:${String(value)}`;
  }
  try {
    return `object:${JSON.stringify(value)}`;
  } catch (error) {
    return `object:${String(value)}`;
  }
}

function is_observable(value) {
  return typeof value === 'object' && value !== null;
}
