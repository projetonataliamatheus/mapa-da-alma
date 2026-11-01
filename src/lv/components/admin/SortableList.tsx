// @ts-nocheck
"use client";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Persist / load a tab order by string ids.
 * Missing new ids get appended at the end; unknown saved ids are dropped.
 */
export function useSortedOrder<T extends { id: string }>(
  storageKey: string,
  items: T[],
): [T[], (next: T[]) => void] {
  const [order, setOrder] = useState<T[]>(() => reconcile(items, load(storageKey)));

  // Reconcile whenever base items change (e.g. dependency changes)
  useEffect(() => {
    setOrder((prev) => reconcile(items, prev.map((i) => i.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join("|")]);

  const update = (next: T[]) => {
    setOrder(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next.map((i) => i.id)));
    } catch {}
  };

  return [order, update];
}

function load(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function reconcile<T extends { id: string }>(items: T[], savedIds: string[]): T[] {
  const map = new Map(items.map((i) => [i.id, i]));
  const ordered: T[] = [];
  savedIds.forEach((id) => {
    const found = map.get(id);
    if (found) {
      ordered.push(found);
      map.delete(id);
    }
  });
  // append any new items in their original order
  items.forEach((i) => {
    if (map.has(i.id)) ordered.push(i);
  });
  return ordered;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function SortableItem({ id, children, className }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.75 : 1,
    cursor: "grab",
    touchAction: "none",
  };
  return (
    <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (next: T[]) => void;
  renderItem: (item: T) => React.ReactNode;
  className?: string;
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => items.map((i) => i.id), [items]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        <div className={className}>{items.map((item) => renderItem(item))}</div>
      </SortableContext>
    </DndContext>
  );
}
