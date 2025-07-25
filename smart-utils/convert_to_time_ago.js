/**
 * convert_to_time_ago
 * Converts a timestamp to a human readable relative time string.
 * Accepts seconds or milliseconds.
 * @param {number} timestamp
 * @returns {string}
 */
export function convert_to_time_ago(timestamp) {
  const now = Date.now();
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const diff_ms = now - ms;
  const seconds = Math.floor(diff_ms / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 }
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  return 'just now';
}
