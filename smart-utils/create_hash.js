/**
 * Creates a SHA-256 hash of the given text.
 * @param {string} text - The text to hash.
 * @returns {Promise<string>} The SHA-256 hash of the text.
 */
export async function create_hash(text) {
  // if text length greater than 100000, truncate
  if (text.length > 100000) text = text.substring(0, 100000);
  const msgUint8 = new TextEncoder().encode(text.trim()); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

/**
 * @description
 * Provides a non-cryptographic hash function (MurmurHash3 32-bit) in pure JavaScript,
 * plus a helper to convert to an alphanumeric base (base 36) for shorter string output.
 */

/**
 * Computes MurmurHash3 (32-bit) for a given string with an optional seed.
 * Returns a signed 32-bit integer (could be negative).
 * 
 * @param {string} input_string - The string to hash.
 * @param {number} [seed=0] - The seed value.
 * @returns {number} - The 32-bit hash as a signed integer.
 */
export function murmur_hash_32(input_string, seed = 0) {
  let remainder = input_string.length & 3; // input_string.length % 4
  let bytes = input_string.length - remainder;
  let h1 = seed;
  let c1 = 0xcc9e2d51;
  let c2 = 0x1b873593;
  let i = 0;
  let k1 = 0;
  let chunk = 0;

  while (i < bytes) {
    chunk =
      (input_string.charCodeAt(i) & 0xff) |
      ((input_string.charCodeAt(i + 1) & 0xff) << 8) |
      ((input_string.charCodeAt(i + 2) & 0xff) << 16) |
      ((input_string.charCodeAt(i + 3) & 0xff) << 24);

    i += 4;

    k1 = chunk;
    k1 = multiply_32(k1, c1);
    k1 = rotate_left_32(k1, 15);
    k1 = multiply_32(k1, c2);

    h1 ^= k1;
    h1 = rotate_left_32(h1, 13);
    h1 = (h1 * 5 + 0xe6546b64) | 0;
  }

  k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (input_string.charCodeAt(i + 2) & 0xff) << 16;
      // falls through
    case 2:
      k1 ^= (input_string.charCodeAt(i + 1) & 0xff) << 8;
      // falls through
    case 1:
      k1 ^= (input_string.charCodeAt(i) & 0xff);
      k1 = multiply_32(k1, c1);
      k1 = rotate_left_32(k1, 15);
      k1 = multiply_32(k1, c2);
      h1 ^= k1;
      break;
    // No default
  }

  // finalization
  h1 ^= input_string.length;
  h1 = fmix_32(h1);

  return h1 | 0;
}

/**
 * Creates an alphanumeric (base 36) representation of the 32-bit MurmurHash3 result.
 * 
 * @param {string} input_string - The string to hash.
 * @param {number} [seed=0] - The seed for the hash.
 * @returns {string} - The hash converted to base 36. (Unsigned)
 */
export function murmur_hash_32_alphanumeric(input_string, seed = 0) {
  // Get the signed 32-bit hash
  const signed_hash = murmur_hash_32(input_string, seed);

  // Force to unsigned, then convert to base 36
  const unsigned_hash = signed_hash >>> 0;
  return unsigned_hash.toString(36);
}

/**
 * 32-bit multiply helper
 */
function multiply_32(a, b) {
  return ((a & 0xffff) * b + (((a >>> 16) * b) << 16)) | 0;
}

/**
 * 32-bit rotate left.
 * 
 * @param {number} value 
 * @param {number} shift 
 * @returns {number}
 */
function rotate_left_32(value, shift) {
  return (value << shift) | (value >>> (32 - shift));
}

/**
 * fmix function finalizes the hash.
 * 
 * @param {number} h 
 * @returns {number}
 */
function fmix_32(h) {
  h ^= h >>> 16;
  h = multiply_32(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = multiply_32(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h | 0;
}


/**
 * @description Pure JavaScript implementation of FNV-1a 32-bit hash
 * and alphanumeric base-36 encoding for compact identifiers.
 */

/**
 * Compute FNV-1a 32-bit hash (unsigned integer).
 *
 * @param {string} input_string - The string to hash.
 * @returns {number} - The 32-bit hash as an unsigned integer.
 */
export function fnv1a_32(input_string) {
  let hash = 2166136261; // FNV offset basis
  const prime = 16777619;

  for (let i = 0; i < input_string.length; i++) {
    hash ^= input_string.charCodeAt(i);
    hash = fnv_multiply_32(hash, prime);
  }

  return hash >>> 0;
}

/**
 * Converts FNV-1a 32-bit hash to alphanumeric (base 36) representation.
 *
 * @param {string} input_string - The string to hash.
 * @returns {string} - Base-36 representation (~7 chars).
 */
export function fnv1a_32_alphanumeric(input_string) {
  return fnv1a_32(input_string).toString(36);
}

/**
 * Helper to handle 32-bit integer overflow multiplication.
 *
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function fnv_multiply_32(a, b) {
  return (a * b) >>> 0;
}