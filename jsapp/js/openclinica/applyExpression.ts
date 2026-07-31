/**
 * OC fork — P1.3 apply-path helpers for the Logic Builder AI Generator.
 *
 * Extracted from `EditableForm.tsx` so the write path is unit-testable without
 * mounting the whole Form Designer component. `EditableForm` maps the returned
 * outcome onto user-facing feedback (alertify) and dialog state; everything
 * that touches the Backbone row lives here.
 */
import { ATTRIBUTE_LABELS } from '@openclinica/logic-builder'
import { columnToTab } from './logicBuilderTabs'

// Only Calculation and Default block newlines on manual entry, so an applied
// AI result is normalized only for those two (PR#273 round-1 #3).
const NEWLINE_STRIPPING_ATTRIBUTES = new Set(['calculation', 'default'])

// Facade-backed attributes: RowDetail.getValue() for these returns
// `facade.serialize()`, NOT the raw stored string — and the skip-logic builder
// silently DROPS any clause whose field it cannot resolve, then re-serializes
// only what is left. Save persists getValue(), so an applied expression can
// lose clauses with no error (PR#273 round-3).
const FACADE_ATTRIBUTES = new Set(['relevant', 'constraint'])

export interface StoredMismatch {
  intended: string
  stored: string
}

export type ApplyOutcome =
  | { status: 'applied'; storedMismatch: StoredMismatch | null }
  | { status: 'error'; reason: 'missing-detail' | 'detached-row' | 'write-failed' }

/**
 * The serializer's formatting differs from raw typed text (operator spacing,
 * quote style), so compare with whitespace removed and quotes unified — a
 * heuristic: it only needs to catch real clause loss, not formatting drift.
 */
function comparable(expression: string): string {
  return expression.replace(/\s+/g, '').replace(/"/g, "'")
}

/**
 * Write an applied expression into a row's attribute (via the RowDetail
 * wrapper — never `row.set('<col>', …)`) and report what actually happened.
 */
export function applyExpressionToRow(row: any, attribute: string, expression: string): ApplyOutcome {
  const detail = row?.get?.(attribute)
  if (!detail?.set) {
    return { status: 'error', reason: 'missing-detail' }
  }
  // A detached row (`BaseRow.detach()` nulls `_parent`) still hands out normal
  // RowDetails, but `getSurvey()` returns null — the write would land on an
  // orphan, `trigger('change')` would no-op, and Save would persist nothing
  // while the dialog closed as if Apply worked (PR#273 round-3).
  const survey = row.getSurvey?.()
  if (!survey) {
    return { status: 'error', reason: 'detached-row' }
  }
  try {
    const value = NEWLINE_STRIPPING_ATTRIBUTES.has(attribute) ? expression.replace(/\r?\n/g, '') : expression
    detail.set('value', value)
    // `relevant`/`constraint` are not in the auto-`change` whitelist, so
    // trigger it explicitly (idempotent for every attribute) to enable Save.
    survey.trigger?.('change')
    if (FACADE_ATTRIBUTES.has(attribute)) {
      const stored = String(detail.getValue?.() ?? '')
      if (comparable(stored) !== comparable(value)) {
        return { status: 'applied', storedMismatch: { intended: value, stored } }
      }
    }
    return { status: 'applied', storedMismatch: null }
  } catch (e) {
    console.error('Logic Builder: failed to apply generated expression', e)
    return { status: 'error', reason: 'write-failed' }
  }
}

// Per-attribute expression input inside the (single) open settings drawer.
// Only one drawer can be open while the dialog is up — the whole builder is
// inert behind it — so a document-level lookup is unambiguous. The facade
// panels (relevant/constraint) have no single text input; focus their first
// interactive control inside `.skiplogic__main`.
const PANEL_INPUT_SELECTORS: Partial<Record<string, string>> = {
  calculation: '.js-calculation-input',
  default: '.js-default-value-input',
  repeat_count: '.repeat-count-panel__input',
  required: '.js-mandatory-setting-custom-text, .mandatory-setting-custom-text',
  relevant:
    '.js-card-settings-relevant-logic .skiplogic__main select, .js-card-settings-relevant-logic .skiplogic__main textarea, .js-card-settings-relevant-logic .skiplogic__main input',
  constraint:
    '.js-card-settings-validation-criteria .skiplogic__main select, .js-card-settings-validation-criteria .skiplogic__main textarea, .js-card-settings-validation-criteria .skiplogic__main input',
}

/**
 * Move focus to the panel's expression input after Apply (P1.3 AC4): "Apply
 * closes the dialog and moves focus to the panel's expression field". The
 * dialog deliberately skips its own focus-restore on Apply and defers to the
 * host — this is that hand-off. Call it only after the dialog has unmounted
 * and the builder's inert state is cleared (focusing an inert element is a
 * silent no-op).
 */
export function focusPanelInput(attribute: string, root: ParentNode = document): boolean {
  const selector = PANEL_INPUT_SELECTORS[attribute]
  if (!selector) {
    return false
  }
  const el = root.querySelector<HTMLElement>(selector)
  if (!el) {
    console.warn('Logic Builder: could not find the panel input to focus after Apply', attribute)
    return false
  }
  el.focus()
  return true
}

/**
 * Move focus to the panel's Generate button after a *dismiss* close (Cancel /
 * × / Escape) — P1.1 AC6, the counterpart to focusPanelInput for Apply.
 *
 * The dialog is embedded and the builder is made inert while it is open, so the
 * package's own captured-opener restore does not reliably land back on the
 * Generate button in this host (verified live). We own it here with a fresh
 * lookup — scoped to the attribute via the button's accessible name (set by the
 * package's GenerateButton) — after the dialog unmounts and inert clears.
 */
export function focusGenerateButton(attribute: string, root: ParentNode = document): boolean {
  const tab = columnToTab(attribute)
  if (!tab) {
    return false
  }
  const btn = root.querySelector<HTMLElement>(`button[aria-label="Generate ${ATTRIBUTE_LABELS[tab]} with AI"]`)
  if (!btn) {
    console.warn('Logic Builder: could not find the Generate button to focus after dismiss', attribute)
    return false
  }
  btn.focus()
  return true
}
