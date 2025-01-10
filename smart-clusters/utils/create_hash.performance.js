import { murmur_hash_32, create_hash, murmur_hash_32_alphanumeric } from './create_hash.js';

/**
 * @file performance_test.js
 * 
 * Executes a basic performance test for murmur_hash_32.
 */

const ITERATIONS = 1000000; // One million
const test_string = 'BenchmarkThisString_12345';

/**
 * Measures the time for murmur_hash_32 over a number of iterations.
 */
async function measure_performance() {
  const start_time = Date.now();

  let result;
  for (let i = 0; i < ITERATIONS; i++) {
    result = murmur_hash_32(test_string, i); 
  }

  const end_time = Date.now();
  const elapsed = end_time - start_time;
  console.log(`MurmurHash3 32-bit x ${ITERATIONS} iterations took: ${elapsed} ms`);
  console.log(`Last result (just for reference): ${result}`);

  // const start_time_2 = Date.now();
  // for (let i = 0; i < ITERATIONS; i++) {
  //   result = await create_hash(test_string, i); 
  // }
  // const end_time_2 = Date.now();
  // const elapsed_2 = end_time_2 - start_time_2;
  // console.log(`CreateHash x ${ITERATIONS} iterations took: ${elapsed_2} ms`);
  // console.log(`Last result (just for reference): ${result}`);

  const start_time_3 = Date.now();
  for (let i = 0; i < ITERATIONS; i++) {
    result = murmur_hash_32_alphanumeric(test_string, i); 
  }
  const end_time_3 = Date.now();
  const elapsed_3 = end_time_3 - start_time_3;
  console.log(`MurmurHash3 32-bit alphanumeric x ${ITERATIONS} iterations took: ${elapsed_3} ms`);
  console.log(`Last result (just for reference): ${result}`);

}

measure_performance();
