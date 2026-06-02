import type { RoadmapItem, RoadmapColumn, RoadmapPlacement } from "@/lib/domain";

export const COLUMNS: RoadmapColumn[] = ["now", "next", "later"];

/** Items in a column, sorted by sortOrder ascending. */
export function inColumn(items: RoadmapItem[], column: RoadmapColumn): RoadmapItem[] {
  return items
    .filter((i) => i.column === column)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Move an item to a different column (appended to the end of the target).
 * Pure: returns the new items array and the placement updates to persist.
 */
export function moveItem(
  items: RoadmapItem[],
  id: string,
  column: RoadmapColumn
): { items: RoadmapItem[]; updates: RoadmapPlacement[] } {
  const item = items.find((i) => i.id === id);
  if (!item || item.column === column) return { items, updates: [] };
  const maxOrder = items.reduce((m, i) => Math.max(m, i.sortOrder), 0);
  const sortOrder = maxOrder + 1;
  const updates: RoadmapPlacement[] = [{ id, column, sortOrder }];
  const next = items.map((i) => (i.id === id ? { ...i, column, sortOrder } : i));
  return { items: next, updates };
}

/**
 * Reorder an item up/down within its column by swapping sortOrder with its
 * neighbour. Pure: returns the new items array and the swaps to persist.
 */
export function reorderItem(
  items: RoadmapItem[],
  id: string,
  direction: "up" | "down"
): { items: RoadmapItem[]; updates: RoadmapPlacement[] } {
  const item = items.find((i) => i.id === id);
  if (!item) return { items, updates: [] };
  const siblings = inColumn(items, item.column);
  const idx = siblings.findIndex((i) => i.id === id);
  const neighbourIdx = direction === "up" ? idx - 1 : idx + 1;
  if (neighbourIdx < 0 || neighbourIdx >= siblings.length) return { items, updates: [] };

  const neighbour = siblings[neighbourIdx];
  const updates: RoadmapPlacement[] = [
    { id: item.id, column: item.column, sortOrder: neighbour.sortOrder },
    { id: neighbour.id, column: neighbour.column, sortOrder: item.sortOrder },
  ];
  const next = items.map((i) => {
    if (i.id === item.id) return { ...i, sortOrder: neighbour.sortOrder };
    if (i.id === neighbour.id) return { ...i, sortOrder: item.sortOrder };
    return i;
  });
  return { items: next, updates };
}
