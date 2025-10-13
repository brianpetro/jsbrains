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

  const clone_with_descriptors = (obj) => {
    const out = Object.create(null);
    for (const key of Reflect.ownKeys(obj)) {
      const d = Object.getOwnPropertyDescriptor(obj, key);
      if (d) {
        try {
          Object.defineProperty(out, key, d);
        } catch {
          // Fallback if descriptor is non-cloneable in this environment
          out[key] = obj[key];
        }
      }
    }
    return out;
  };

  // Snapshot of the source at creation time (keys and descriptors)
  const source = clone_with_descriptors(input);

  const has_own = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
  const cache = Object.create(null);
  const bind_or_pass = (val) => {
    if (val && typeof val === "object" && typeof val.action === "function") {
      return val.action.bind(ctx);
    }
    return (typeof val === "function" ? val.bind(ctx) : val);
  };

  const compute_and_cache = (target, prop) => {
    // scoped
    const scope_key = ctx.constructor.key;
    if (scope_key && has_own(source, scope_key) && has_own(source[scope_key], prop)) {
      const out = bind_or_pass(source[scope_key][prop]);
      target[prop] = out;
      return out;
    }
    // global
    if (has_own(source, prop)) {
      const out = bind_or_pass(source[prop]);
      target[prop] = out;
      return out;
    }
    // Cache misses as undefined to avoid repeated lookups
    target[prop] = undefined;
    return undefined;
  };

  const union_keys = () => {
    const s = new Set([...Reflect.ownKeys(source), ...Reflect.ownKeys(cache)]);
    return Array.from(s);
  };

  return new Proxy(cache, {
    get: (target, prop) => {
      if (prop === Symbol.toStringTag) return "ActionsProxy";
      if (prop in target) return target[prop];
      return compute_and_cache(target, prop);
    },

    has: (target, prop) => {
      if (prop in target) return true;
      return has_own(source, prop);
    },

    ownKeys: () => union_keys(),

    getOwnPropertyDescriptor: (target, prop) => {
      if (has_own(target, prop)) {
        return {
          configurable: true,
          enumerable: true,
          value: target[prop]
        };
      }
      if (has_own(source, prop)) {
        if (!has_own(target, prop)) {
          target[prop] = bind_or_pass(source[prop]);
        }
        const d = Object.getOwnPropertyDescriptor(source, prop);
        const enumerable = d ? !!d.enumerable : true;
        return {
          configurable: true,
          enumerable,
          value: target[prop]
        };
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
        return true;
      }
      return true;
    }
  });
}