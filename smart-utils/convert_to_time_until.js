
export function convert_to_time_until(timestamp) {
  const now = Date.now();
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const diff_ms = ms - now;
  if (diff_ms < 0) return 'expired';
  const seconds = Math.floor(diff_ms / 1000);
  const intervals = [
    { label: 'decade', seconds: 315360000 },
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
      // 2026-04-15: this is the wrong scope for this conditional, it should be moved (jsbrains is for platform-agnostic implementations) in the future
      if (interval.label === 'decade') {
        return 'never (lifetime access)';
      }
      return `in ${count} ${interval.label}${count > 1 ? 's' : ''}`;
    }
  }
  return 'in a few seconds';
}
