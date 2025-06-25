/**
 * Fetches a JSON payload from url, caching to disk in Node
 * and to localStorage in the browser. Subsequent calls read
 * from cache synchronously when possible.
 *
 * @param {string} url - remote JSON url
 * @param {string} [cache_key] - storage key / filename
 * @returns {Promise<object>}
 */
export async function fetch_json_cached(url, cache_key = url) {
  const is_browser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
  if (is_browser) {
    const cached_text = window.localStorage.getItem(cache_key);
    if (cached_text) return JSON.parse(cached_text);
    const remote = await do_fetch(url);
    window.localStorage.setItem(cache_key, JSON.stringify(remote));
    return remote;
  }
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const os = await import('node:os');
  const cache_dir = path.join(os.homedir(), '.cache', 'smart-embed-model');
  const cache_file = path.join(cache_dir, cache_key);
  try {
    const txt = await fs.readFile(cache_file, 'utf8');
    return JSON.parse(txt);
  } catch {}
  const remote = await do_fetch(url);
  await fs.mkdir(cache_dir, { recursive: true });
  await fs.writeFile(cache_file, JSON.stringify(remote), 'utf8');
  return remote;
}

/**
 * Wrapper around global fetch that throws on network failure.
 * @private
 */
async function do_fetch(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`failed to download ${url} – ${resp.status}`);
  return await resp.json();
}
