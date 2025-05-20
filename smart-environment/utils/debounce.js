
/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @param {Object} context - The context to apply when calling func
 * @return {Function} The debounced function
 */
export function debounce(func, wait, opts = {}) {
  const { immediate = false, context = null } = opts;
  let timeout = null;

  const debounced = function (...args) {
    const call_now = immediate && !timeout;
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) func.apply(context || this, args);
    }, wait);

    if (call_now) func.apply(context || this, args);
  };

  debounced.cancel = () => {
    clearTimeout(timeout);
    timeout = null;
  };

  return debounced;
}
