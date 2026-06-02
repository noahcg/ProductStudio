/**
 * Backward-compatibility re-export.
 *
 * The canonical domain model now lives in `@/lib/domain` (one file per
 * entity). This module simply re-exports it so existing `@/lib/types` imports
 * keep working. Prefer importing from `@/lib/domain` in new code.
 */
export * from "./domain";
