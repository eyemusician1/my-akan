export function orderDues<T extends {id: string}>(
  dues: readonly T[],
  priority: readonly string[],
): T[] {
  const ranks = new Map(priority.map((id, index) => [id, index]));
  return [...dues].sort(
    (a, b) =>
      (ranks.get(a.id) ?? priority.length) -
      (ranks.get(b.id) ?? priority.length),
  );
}

export function moveDue(
  ids: readonly string[],
  from: number,
  to: number,
): string[] {
  if (from < 0 || from >= ids.length || to < 0 || to >= ids.length)
    return [...ids];
  const next = [...ids];
  const [id] = next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

export function getDropIndex(
  from: number,
  distance: number,
  slotHeight: number,
  count: number,
): number {
  return Math.max(
    0,
    Math.min(count - 1, from + Math.round(distance / slotHeight)),
  );
}
