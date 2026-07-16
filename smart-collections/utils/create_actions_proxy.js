// ESM module
// No deps. 2-space indent. snake_case for locals and methods. Semicolons.

/** @typedef {Object.<string, any> & {constructor: Function & {key?: string}}} ActionsProxyContext */

const empty_actions = Object.freeze(Object.create(null));
const missing_action = Symbol("missing_action");
const registry_cache = new WeakMap();
const proxy_state = new WeakMap();
/** @type {Set<string | symbol>} */
const ignored_meta_keys = new Set(["length", "name", "prototype"]);

/**
 * Create a lazy-binding, reflective Proxy over ordered action sources.
 * Functions are bound to ctx on first access and cached on that proxy.
 * Registries are shared by proxies using the same ordered source objects.
 *
 * @param {ActionsProxyContext} ctx collection/item instance used as `this` for action functions
 * @param {Record<string | symbol, any> | Array<Record<string | symbol, any>>} actions_source one source or ordered sources, lowest precedence first
 * @returns {Record<string | symbol, any>} proxy that lazily resolves, binds, and preserves reflection
 */
export function create_actions_proxy(ctx, actions_source) {
  const actions_sources = Array.isArray(actions_source) && actions_source.length
    ? actions_source
    : [actions_source || empty_actions];
  const target = Object.create(null);
  proxy_state.set(target, {
    ctx,
    registry: get_actions_registry(actions_sources),
  });
  return new Proxy(target, actions_proxy_handler);
}

const actions_proxy_handler = {
  get(target, prop) {
    if (prop === Symbol.toStringTag) return "ActionsProxy";
    if (has_own(target, prop)) return target[prop];

    const state = proxy_state.get(target);
    const action_entry = state.registry.get(state.ctx?.constructor?.key, prop);
    const action = materialize_action(state.ctx, action_entry);
    target[prop] = action;
    return action;
  },

  has(target, prop) {
    if (has_own(target, prop)) return true;
    const state = proxy_state.get(target);
    return state.registry.get(state.ctx?.constructor?.key, prop) !== missing_action;
  },

  ownKeys(target) {
    const state = proxy_state.get(target);
    return Array.from(new Set([
      ...Reflect.ownKeys(target),
      ...state.registry.keys(state.ctx?.constructor?.key),
    ]));
  },

  getOwnPropertyDescriptor(target, prop) {
    if (!has_own(target, prop)) {
      const state = proxy_state.get(target);
      const action_entry = state.registry.get(state.ctx?.constructor?.key, prop);
      if (action_entry === missing_action) return undefined;
      target[prop] = materialize_action(state.ctx, action_entry);
    }
    return {
      configurable: true,
      enumerable: true,
      value: target[prop],
    };
  },

  defineProperty(target, prop, descriptor) {
    if (!("value" in descriptor)) return false;
    target[prop] = descriptor.value;
    return true;
  },

  set(target, prop, value) {
    target[prop] = value;
    return true;
  },

  deleteProperty(target, prop) {
    if (has_own(target, prop)) delete target[prop];
    return true;
  },
};

function get_actions_registry(actions_sources) {
  let cache = registry_cache;
  let cache_entry;

  for (const actions_source of actions_sources) {
    const source = actions_source || empty_actions;
    cache_entry = cache.get(source);
    if (!cache_entry) {
      cache_entry = {
        children: new WeakMap(),
        registry: null,
      };
      cache.set(source, cache_entry);
    }
    cache = cache_entry.children;
  }

  if (!cache_entry.registry) {
    cache_entry.registry = create_actions_registry(
      actions_sources.map(source => source || empty_actions),
    );
  }
  return cache_entry.registry;
}

function create_actions_registry(actions_sources) {
  const actions_bucket_cache = new WeakMap();
  const get_is_actions_bucket = value => {
    if (!is_plain_object(value)) return false;
    if (!actions_bucket_cache.has(value)) {
      actions_bucket_cache.set(value, is_actions_bucket(value));
    }
    return actions_bucket_cache.get(value);
  };

  return {
    get(scope_key, action_key) {
      if (scope_key !== undefined && scope_key !== null) {
        const scoped_actions = get_source_entry(actions_sources, scope_key);
        if (get_is_actions_bucket(scoped_actions) && has_own(scoped_actions, action_key)) {
          return scoped_actions[action_key];
        }
      }

      const action_entry = get_source_entry(actions_sources, action_key);
      return get_is_actions_bucket(action_entry) ? missing_action : action_entry;
    },

    keys(scope_key) {
      const merged_keys = new Set();
      for (const source of actions_sources) {
        for (const key of Reflect.ownKeys(source)) {
          if (Object.prototype.propertyIsEnumerable.call(source, key)) {
            merged_keys.add(key);
          }
        }
      }

      const action_keys = new Set();
      for (const key of merged_keys) {
        const action_entry = get_source_entry(actions_sources, key);
        if (!get_is_actions_bucket(action_entry)) action_keys.add(key);
      }

      if (scope_key !== undefined && scope_key !== null) {
        const scoped_actions = get_source_entry(actions_sources, scope_key);
        if (get_is_actions_bucket(scoped_actions)) {
          for (const key of Reflect.ownKeys(scoped_actions)) {
            action_keys.add(key);
          }
        }
      }
      return Array.from(action_keys);
    },
  };
}

function get_source_entry(actions_sources, key) {
  for (let i = actions_sources.length - 1; i >= 0; i -= 1) {
    const source = actions_sources[i];
    if (Object.prototype.propertyIsEnumerable.call(source, key)) {
      return source[key];
    }
  }
  return missing_action;
}

function materialize_action(ctx, action_entry) {
  if (action_entry === missing_action) return undefined;

  if (is_class_export(action_entry)) {
    const instance = new action_entry(ctx);
    const action = instance.action || instance.run || instance.execute || instance.call;
    if (typeof action === "function") {
      const bound = action.bind(instance);
      copy_metadata(action_entry, bound);
      copy_metadata(instance, bound);
      bound.instance = instance;
      return bound;
    }
    copy_metadata(action_entry, instance);
    return instance;
  }

  if (is_action_object(action_entry)) {
    const action_object = clone_with_descriptors(action_entry);
    const bound = action_object.action.bind(ctx);
    copy_metadata(action_object, bound, "action");
    return bound;
  }

  if (typeof action_entry === "function") {
    const bound = action_entry.bind(ctx);
    copy_metadata(action_entry, bound);
    return bound;
  }

  if (is_plain_object(action_entry)) {
    return clone_with_descriptors(action_entry);
  }
  return action_entry;
}

function copy_metadata(source, target, omitted_key = null) {
  if (!source || !target) return;
  for (const key of Reflect.ownKeys(source)) {
    if (ignored_meta_keys.has(key) || key === omitted_key) continue;
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor) continue;
    try {
      Object.defineProperty(target, key, descriptor);
    } catch {
      target[key] = descriptor.value;
    }
  }
}

function clone_with_descriptors(object) {
  if (!is_plain_object(object)) return object;
  const clone = Object.create(Object.getPrototypeOf(object) || null);
  for (const key of Reflect.ownKeys(object)) {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (!descriptor) continue;
    const next = { ...descriptor };
    if ("value" in next && is_plain_object(next.value)) {
      next.value = clone_with_descriptors(next.value);
    }
    try {
      Object.defineProperty(clone, key, next);
    } catch {
      clone[key] = next.value;
    }
  }
  return clone;
}

function is_actions_bucket(value) {
  if (!is_plain_object(value) || is_action_object(value)) return false;
  const keys = Reflect.ownKeys(value);
  if (!keys.length) return false;

  let found_action = false;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !("value" in descriptor)) return false;
    const entry = descriptor.value;

    if (typeof entry === "undefined") continue;
    if (typeof entry === "function" || is_action_object(entry)) {
      found_action = true;
      continue;
    }
    if (is_actions_bucket(entry)) {
      found_action = true;
      continue;
    }
    return false;
  }
  return found_action;
}

function is_action_object(value) {
  return is_plain_object(value) && typeof value.action === "function";
}

function is_class_export(value) {
  return (
    typeof value === "function"
    && /^class\s/.test(Function.prototype.toString.call(value))
  );
}

function is_plain_object(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function has_own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
