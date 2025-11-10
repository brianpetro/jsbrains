// ESM module
// No deps. 2-space indent. snake_case for locals and methods. Semicolons.

/**
 * Create a lazy-binding, reflective Proxy over an actions object.
 * Functions are bound to ctx on first access and cached. Non-functions are passed through.
 * Snapshot semantics: the available keys and their base values are captured at creation.
 *
 * @param {object} ctx collection/item instance used as `this` for action functions
 * @param {Record<string | symbol, any>} actions_source object containing available actions
 * @returns {Record<string | symbol, any>} proxy that lazily binds and preserves reflection
 */
export function create_actions_proxy(ctx, actions_source) {
  const input = actions_source || {};

  const is_plain_object = (val) => typeof val === "object" && val !== null && !Array.isArray(val);
  const is_function = (val) => typeof val === "function";
  const is_class_export = (val) => is_function(val) && /^class\s/.test(Function.prototype.toString.call(val));
  const is_action_object = (val) => is_plain_object(val) && is_function(val.action);
  const is_action_candidate = (val) => is_function(val) || is_action_object(val) || is_class_export(val);
  const ignored_meta_keys = new Set(["length", "name", "prototype"]);

  const clone_with_descriptors = (obj) => {
    if (!is_plain_object(obj)) return obj;
    const out = Object.create(Object.getPrototypeOf(obj) || null);
    for (const key of Reflect.ownKeys(obj)) {
      const descriptor = Object.getOwnPropertyDescriptor(obj, key);
      if (!descriptor) continue;
      const next = { ...descriptor };
      if ("value" in next && is_plain_object(next.value)) {
        next.value = clone_with_descriptors(next.value);
      }
      try {
        Object.defineProperty(out, key, next);
      } catch {
        out[key] = next.value;
      }
    }
    return out;
  };

  const should_bucket_actions = (val) => {
    if (!is_plain_object(val)) return false;
    if (is_action_object(val)) return false;
    const keys = Reflect.ownKeys(val);
    if (keys.length === 0) return false;
    let found_candidate = false;
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(val, key);
      if (!descriptor) continue;
      if ("value" in descriptor) {
        const entry = descriptor.value;
        if (is_action_candidate(entry)) {
          found_candidate = true;
          continue;
        }
        if (is_plain_object(entry)) {
          if (should_bucket_actions(entry)) {
            found_candidate = true;
            continue;
          }
          return false;
        }
        if (typeof entry === "undefined") continue;
        return false;
      }
      return false;
    }
    return found_candidate;
  };

  const clone_descriptor = (descriptor) => {
    if (!descriptor) return descriptor;
    if (!("value" in descriptor)) return { ...descriptor };
    const cloned = is_plain_object(descriptor.value)
      ? clone_with_descriptors(descriptor.value)
      : descriptor.value;
    return { ...descriptor, value: cloned };
  };

  const build_sources = (src) => {
    const global_source = Object.create(null);
    const scoped_sources = new Map();
    for (const key of Reflect.ownKeys(src)) {
      const descriptor = Object.getOwnPropertyDescriptor(src, key);
      if (!descriptor) continue;
      if ("value" in descriptor && should_bucket_actions(descriptor.value)) {
        scoped_sources.set(key, clone_with_descriptors(descriptor.value));
        continue;
      }
      try {
        Object.defineProperty(global_source, key, clone_descriptor(descriptor));
      } catch {
        global_source[key] = descriptor.value;
      }
    }
    return { global_source, scoped_sources };
  };

  const { global_source, scoped_sources } = build_sources(input);
  const has_own = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  const cache = Object.create(null);

  const copy_metadata = (source, target, omit = []) => {
    if (!source || !target) return;
    const skips = new Set([...ignored_meta_keys, ...omit]);
    for (const key of Reflect.ownKeys(source)) {
      if (skips.has(key)) continue;
      const descriptor = Object.getOwnPropertyDescriptor(source, key);
      if (!descriptor) continue;
      try {
        Object.defineProperty(target, key, descriptor);
      } catch {
        target[key] = descriptor.value;
      }
    }
  };

  const instantiate_class = (Ctor) => {
    const instance = new Ctor(ctx);
    const candidate = instance.action || instance.run || instance.execute || instance.call;
    if (is_function(candidate)) {
      const bound = candidate.bind(instance);
      copy_metadata(Ctor, bound);
      copy_metadata(instance, bound);
      bound.instance = instance;
      return bound;
    }
    copy_metadata(Ctor, instance);
    return instance;
  };

  const bind_or_clone = (val) => {
    if (is_class_export(val)) {
      return instantiate_class(val);
    }
    if (is_action_object(val)) {
      const bound = val.action.bind(ctx);
      copy_metadata(val, bound, ["action"]);
      return bound;
    }
    if (is_function(val)) {
      const bound = val.bind(ctx);
      copy_metadata(val, bound);
      return bound;
    }
    if (is_plain_object(val)) {
      return clone_with_descriptors(val);
    }
    return val;
  };

  const scope_actions_for = () => {
    const scope_key = ctx?.constructor?.key;
    if (typeof scope_key === "undefined" || scope_key === null) return null;
    const bucket = scoped_sources.get(scope_key);
    return bucket && is_plain_object(bucket) ? bucket : null;
  };

  const cache_result = (target, prop, value) => {
    target[prop] = value;
    return value;
  };

  const compute_and_cache = (target, prop) => {
    const scoped = scope_actions_for();
    if (scoped && has_own(scoped, prop)) {
      return cache_result(target, prop, bind_or_clone(scoped[prop]));
    }
    if (has_own(global_source, prop)) {
      return cache_result(target, prop, bind_or_clone(global_source[prop]));
    }
    return cache_result(target, prop, undefined);
  };

  const union_keys = () => {
    const scoped = scope_actions_for();
    const keys = new Set(Reflect.ownKeys(cache));
    for (const key of Reflect.ownKeys(global_source)) {
      keys.add(key);
    }
    if (scoped) {
      for (const key of Reflect.ownKeys(scoped)) {
        keys.add(key);
      }
    }
    return Array.from(keys);
  };

  const descriptor_for = (target, prop) => ({
    configurable: true,
    enumerable: true,
    value: target[prop]
  });

  return new Proxy(cache, {
    get: (target, prop) => {
      if (prop === Symbol.toStringTag) return "ActionsProxy";
      if (prop in target) return target[prop];
      return compute_and_cache(target, prop);
    },

    has: (target, prop) => {
      if (prop in target) return true;
      const scoped = scope_actions_for();
      if (scoped && has_own(scoped, prop)) return true;
      return has_own(global_source, prop);
    },

    ownKeys: () => union_keys(),

    getOwnPropertyDescriptor: (target, prop) => {
      if (has_own(target, prop)) {
        return descriptor_for(target, prop);
      }
      const scoped = scope_actions_for();
      if (scoped && has_own(scoped, prop)) {
        if (!has_own(target, prop)) {
          compute_and_cache(target, prop);
        }
        return descriptor_for(target, prop);
      }
      if (has_own(global_source, prop)) {
        if (!has_own(target, prop)) {
          compute_and_cache(target, prop);
        }
        return descriptor_for(target, prop);
      }
      return undefined;
    },

    defineProperty: (target, prop, descriptor) => {
      if ("value" in descriptor) {
        target[prop] = descriptor.value;
        return true;
      }
      return false;
    },

    set: (target, prop, value) => {
      target[prop] = value;
      return true;
    },

    deleteProperty: (target, prop) => {
      if (has_own(target, prop)) {
        delete target[prop];
      }
      return true;
    }
  });
}