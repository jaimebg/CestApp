export function mergePages<T>(
  prev: T[],
  next: T[],
  reset: boolean,
  key: (item: T) => string | number
): T[] {
  if (reset) return next;
  const seen = new Set(prev.map(key));
  return [...prev, ...next.filter((item) => !seen.has(key(item)))];
}
