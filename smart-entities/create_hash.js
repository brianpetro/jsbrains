export async function create_hash(text) {
  // if text length greater than 100000, truncate
  if (text.length > 100000) text = text.substring(0, 100000);
  const msgUint8 = new TextEncoder().encode(text.trim()); // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}