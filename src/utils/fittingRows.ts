/**
 * How many rows of a list fit on the first screen.
 *
 * `listTop` comes from the list's own onLayout, which is relative to its
 * parent; `parentTop` is where that parent starts in the scroll content (the
 * safe-area padding, for a wrapper at the top), so the two add up to the real
 * position. Before layout the minimum is used.
 */
export function fittingRows({
  viewportHeight,
  listTop,
  parentTop,
  rowHeight,
  min,
  max,
}: {
  viewportHeight: number;
  listTop: number;
  parentTop: number;
  rowHeight: number;
  min: number;
  max: number;
}): number {
  const available = viewportHeight - (listTop + parentTop);
  if (viewportHeight <= 0 || available <= 0) return min;
  return Math.min(max, Math.max(min, Math.floor(available / rowHeight)));
}
