/**
 * Sequentially executes an array of asynchronous functions, passing the result of each function
 * as the input to the next, along with an optional options object.
 *
 * @param {Function[]} funcs - An array of functions to execute sequentially (may be async functions).
 * @param {*} initial_value - The initial value to pass to the first function in the array.
 * @param {Object} opts - Optional parameters to pass to each function.
 * @returns {*} The final value after all functions have been executed.
 * @throws {Error} Throws an error if any function in the array is not actually a function or if an async function throws an error.
 */

export async function sequential_async_processor(funcs, initial_value, opts = {}) {
  let value = initial_value;
  for (const func of funcs) {
    // Ensure each element is a function before attempting to call it
    if (typeof func !== 'function') {
      throw new TypeError('All elements in async_functions array must be functions');
    }
    try {
      value = await func(value, opts);
    } catch (error) {
      // console.error("Error encountered during sequential processing:", error);
      throw error; // Rethrow to halt execution, or handle differently if continuation is desired
    }
  }

  return value;
}

  // /**
  //  * Retrieves items from the collection based on the provided strategy and options.
  //  * @param {Function[]} strategy - The strategy used to retrieve the items.
  //  * @param {Object} opts - The options used to retrieve the items.
  //  * @return {CollectionItem[]} The retrieved items.
  //  * @throws {Error} Throws an error if any function in the strategy array is not actually a function or if an async function throws an error.
  //  */
  // async retrieve(strategy=[], opts={}) { return await sequential_async_processor(funcs, this.filter(opts), opts); }