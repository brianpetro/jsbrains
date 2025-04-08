import { deep_merge_no_overwrite } from './deep_merge_no_overwrite.js';

export function merge_env_config(target, incoming) {
  for (const [key, value] of Object.entries(incoming)) {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        target[key] = [...(target[key] || []), ...value];
      } else {
        if (!target[key]) target[key] = {};
        deep_merge_no_overwrite(target[key], value);
      }
    } else if(value !== target[key]) {
      if (target[key] !== undefined) {
        console.warn(
          `SmartEnv: Overwriting existing property ${key} in smart_env_config`,
          {old: target[key], new: value}
        );
      }
      target[key] = value;
    }
  }
  return target;
}