/**
 * Single source for the accent/category hex values used in TypeScript
 * (SVG fills, inline progress-bar backgrounds, donut segments).
 *
 * Consolidates colors that were previously duplicated across `icons.tsx`
 * and the spend mock data (CURRENT_STATE §10). The CSS theme tokens in
 * `globals.css` remain the source for class-based colors — these constants
 * cover only the values that must be passed as inline `style` strings.
 */
export const accentBar = {
  amber: "#f5a623",
  violet: "#7c5cff",
  blue: "#4f8cff",
  orange: "#f97316",
  green: "#2dd4a7",
  teal: "#2dd4bf",
} as const;

/** Spend category colors (map onto the accent palette). */
export const categoryColor = {
  hosting: accentBar.green,
  ai: accentBar.violet,
  domains: accentBar.amber,
} as const;
