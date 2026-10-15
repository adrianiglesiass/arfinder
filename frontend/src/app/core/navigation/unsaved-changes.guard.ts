import { CanDeactivateFn } from '@angular/router';

/** A routed component that may hold changes the user has not saved yet. */
export interface PendingChanges {
  /** Resolves `true` when it is safe to leave (no changes, or the user accepted losing them). */
  canLeave(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<PendingChanges> = (component) =>
  component?.canLeave?.() ?? true;
