
/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param {Function} func - The function to debounce
 * @param {number} wait - The number of milliseconds to delay
 * @param {Object} context - The context to apply when calling func
 * @return {Function} The debounced function
 */
export function debounce(func, wait, context = null) {
  let timeout = null;

  return function (...args) {
    const later = () => {
      timeout = null;
      func.apply(context || this, args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
