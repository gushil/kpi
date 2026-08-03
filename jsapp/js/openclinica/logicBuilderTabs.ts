/**
 * OC fork — P1.1 Logic Builder mapping helpers.
 *
 * Bridges the xlform world (Backbone RowDetail column names) and the
 * `@openclinica/logic-builder` package's `ExpressionTab` union. Every column
 * name matches its tab name except `repeat_count` <-> `repeatCount`.
 */
import type { ExpressionTab } from '@openclinica/logic-builder'

/** Key used on the `stores.surveyState` Reflux store to open/close the dialog. */
export const GENERATE_REQUEST_KEY = 'generateRequest'

/** xlform RowDetail column name -> package ExpressionTab. Partial so an
 * unknown column correctly types the lookup as `ExpressionTab | undefined`. */
const COLUMN_TO_TAB: Partial<Record<string, ExpressionTab>> = {
  calculation: 'calculation',
  default: 'default',
  constraint: 'constraint',
  required: 'required',
  relevant: 'relevant',
  repeat_count: 'repeatCount',
}

/** Map an xlform column name to a package tab. Returns `undefined` if unknown. */
export function columnToTab(column: string): ExpressionTab | undefined {
  return COLUMN_TO_TAB[column]
}

/** Shape stored on `stores.surveyState[GENERATE_REQUEST_KEY]` while the dialog is open. */
export interface GenerateRequest {
  // Backbone Row model (xlform). Typed loosely to avoid pulling coffee types.
  row: any
  // xlform column name, e.g. 'calculation' | 'relevant' | 'repeat_count'.
  attribute: string
  // The row's own settings drawer (`.card__settings`), captured when the
  // Generate button opened the dialog. Scopes the post-close focus lookup to
  // this row so a second open drawer can't be hit (round-5 #2).
  settingsRoot?: HTMLElement | null
}
