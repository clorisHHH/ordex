// Keep the edge bands fixed in pixels so the drop boundary stays predictable.
export function rowDropTarget(rect, x, y) {
  if (y - rect.top < 8) return {position:'before',zone:'top'};
  if (rect.bottom - y < 8) return {position:'after',zone:'bottom'};
  return x - rect.left < rect.width / 2
    ? {position:'after',zone:'left'}
    : {position:'inside',zone:'right'};
}
