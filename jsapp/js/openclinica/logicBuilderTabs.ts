/**
 * OC fork — P1.3 Logic Builder mapping helpers.
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

/** package ExpressionTab -> xlform RowDetail column name. */
const TAB_TO_COLUMN: Record<ExpressionTab, string> = {
  calculation: 'calculation',
  default: 'default',
  constraint: 'constraint',
  required: 'required',
  relevant: 'relevant',
  repeatCount: 'repeat_count',
}

/** Map an xlform column name to a package tab. Returns `undefined` if unknown. */
export function columnToTab(column: string): ExpressionTab | undefined {
  return COLUMN_TO_TAB[column]
}

/** Map a package tab back to its xlform column name. */
export function tabToColumn(tab: ExpressionTab): string {
  return TAB_TO_COLUMN[tab]
}

/** Shape stored on `stores.surveyState[GENERATE_REQUEST_KEY]` while the dialog is open. */
export interface GenerateRequest {
  // Backbone Row model (xlform). Typed loosely to avoid pulling coffee types.
  row: any
  // xlform column name, e.g. 'calculation' | 'relevant' | 'repeat_count'.
  attribute: string
}
