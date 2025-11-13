/**
 * Normalize completion errors from chat model adapters.
 * NOTE: may move to adapters in future
 * @param {unknown} error
 * @returns {{ message: string, details: string | null }}
 */
export function normalize_error(error) {
  console.log('Normalizing error:', error);
  if (error == null) {
    return { message: 'Unknown error', details: null };
  }

  if (typeof error === 'string') {
    return { message: error, details: null };
  }

  if (error instanceof Error) {
    return { message: error.message || 'Unknown error', details: null };
  }

  if (typeof error === 'object') {
    const nested_error = error.error;
    if (nested_error != null) {
      // Delegate to the nested error if present
      return normalize_error(nested_error);
    }

    // collect JSON-compatible properties (excluding 'message' and 'error') into details
    const excludeKeys = new Set(['message', 'error']);
    const isPlainObject = (v) => v != null && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
    const toJsonish = (v) => {
      if (v == null) return null;
      const t = typeof v;
      if (t === 'string' || t === 'number' || t === 'boolean') return v;
      if (Array.isArray(v)) {
        const arr = [];
        for (const item of v) {
          const mapped = toJsonish(item);
          if (mapped !== undefined) arr.push(mapped);
        }
        return arr;
      }
      if (isPlainObject(v)) {
        const out = {};
        for (const k of Object.keys(v)) {
          if (excludeKeys.has(k)) continue;
          const mapped = toJsonish(v[k]);
          if (mapped !== undefined) out[k] = mapped;
        }
        return out;
      }
      // non-JSON types (functions, symbols, bigint, Dates without toJSON handling, etc.) are skipped
      return undefined;
    };

    const rawDetails = toJsonish(error);
    const details = rawDetails && typeof rawDetails === 'object' && Object.keys(rawDetails).length > 0
      ? rawDetails
      : null;

    const message = ('message' in error && typeof error.message === 'string' && error.message.trim().length > 0)
      ? error.message
      : 'Unknown error';

    return { message, details };
  }

  return { message: 'Unknown error', details: null };
}
