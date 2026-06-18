import type { IntentCategory } from "@hotbox/schema";

export function CategoryChip({ category }: { category: IntentCategory }) {
  return <span className="category-chip">{category.replace(/_/g, " ")}</span>;
}
