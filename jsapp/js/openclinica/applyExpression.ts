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

// Attributes edited in single-line inputs (Enter suppressed), which cannot hold
// a line break: Calculation and Default (PR#273 round-1 #3), Required (round-5
// #7), and Repeat Count (OC-28645, deferred from PR#300). An applied multi-line
// value would otherwise be welded by the input's own sanitization and saved
// broken on the next edit. Newlines are replaced with a space (not with
// nothing) to keep adjacent tokens separated and prevent syntax errors like
// `${A}=1and${B}=2` — note manual typing/paste still joins with nothing
// (view.row.coffee), tracked separately.
const NEWLINE_STRIPPING_ATTRIBUTES = new Set(['calculation', 'default', 'required', 'repeat_count'])

// Facade-backed attributes: RowDetail.getValue() for these returns
// `facade.serialize()`, NOT the raw stored string — and the skip-logic builder
// silently DROPS any clause whose field it cannot resolve, then re-serializes
// only what is left. Save persists getValue(), so an applied expression can
// lose clauses with no error (PR#273 round-3).
const FACADE_ATTRIBUTES = new Set(['relevant', 'constraint'])

export type ApplyOutcome =
  | { status: 'applied' }
  // The facade could not represent every clause (it dropped one or more field
  // references it can't resolve). The attempted write is reverted — nothing is
  // persisted — and the unresolved references are reported (round-5 #5).
  | { status: 'rejected'; intended: string; stored: string; unresolved: string[] }
  | { status: 'error'; reason: 'missing-detail' | 'detached-row' | 'write-failed' }

/**
 * Field references (`${name}`) in an expression, in order, duplicates kept.
 * These survive every legitimate reformatting the serializers apply — quote
 * insertion (`123` → `'123'`), `date()` wrapping, operator spacing, the leading
 * `.` a constraint gains — so comparing them is robust where a raw string
 * compare produced false positives (round-5 #3). The one failure mode that
 * matters here — the facade dropping a clause whose field it can't resolve —
 * always removes that clause's `${ref}`.
 */
function fieldRefs(expression: string): string[] {
  return expression.match(/\$\{[^}]+\}/g) ?? []
}

/**
 * Field references present in `intended` but missing from `stored` (multiset
 * difference). Non-empty ⇒ the facade dropped at least one clause on serialize.
 */
function droppedFieldRefs(intended: string, stored: string): string[] {
  const remaining = new Map<string, number>()
  for (const ref of fieldRefs(stored)) {
    remaining.set(ref, (remaining.get(ref) ?? 0) + 1)
  }
  const dropped: string[] = []
  for (const ref of fieldRefs(intended)) {
    const count = remaining.get(ref) ?? 0
    if (count > 0) {
      remaining.set(ref, count - 1)
    } else {
      dropped.push(ref)
    }
  }
  return dropped
}

/**
 * Write an applied expression into a row's attribute (via the RowDetail
 * wrapper — never `row.set('<col>', …)`) and report what actually happened.
 * For facade-backed attributes a lossy write (a clause the facade can't
 * represent) is reverted rather than persisted (round-5 #5).
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
    const value = NEWLINE_STRIPPING_ATTRIBUTES.has(attribute) ? expression.replace(/\r?\n/g, ' ') : expression
    if (FACADE_ATTRIBUTES.has(attribute)) {
      // Capture the RAW stored value so a lossy write reverts to exactly what
      // was there. getValue() is the facade's reserialization, which itself
      // drops clauses it can't resolve — reverting to it would silently reduce
      // pre-existing content while the toast claims nothing changed (round-7).
      const previous = String(detail.get?.('value') ?? '')
      detail.set('value', value)
      // `relevant`/`constraint` are not in the auto-`change` whitelist, so
      // trigger it explicitly (idempotent for every attribute) to enable Save.
      survey.trigger?.('change')
      const stored = String(detail.getValue?.() ?? '')
      const unresolved = droppedFieldRefs(value, stored)
      // The ref-diff can't see a clause with no ${field} reference (e.g. the
      // XPath-dot constraint `. >= 0 and . <= 200`) that the facade drops
      // wholesale — an empty serialization of a non-empty intent is the same
      // silent-data-loss case via a different trigger (PR#273 deferred item).
      const wipedOut = stored.trim() === '' && value.trim() !== ''
      if (unresolved.length > 0 || wipedOut) {
        // Revert: never persist a silently-reduced expression.
        detail.set('value', previous)
        survey.trigger?.('change')
        return { status: 'rejected', intended: value, stored, unresolved }
      }
      return { status: 'applied' }
    }
    detail.set('value', value)
    survey.trigger?.('change')
    return { status: 'applied' }
  } catch (e) {
    console.error('Logic Builder: failed to apply generated expression', e)
    return { status: 'error', reason: 'write-failed' }
  }
}

// Attributes whose stored value can be a state sentinel rather than an
// expression: the Required toggle persists '' | true | false | 'true' |
// 'false' for its simple states (mirrors view.mandatorySetting.coffee's own
// hasExpression test). Only a real expression — or the XLSForm 'yes' the
// bridge writes for Always — should trigger the overwrite confirmation.
const REQUIRED_EMPTY_SENTINELS = new Set(['', 'true', 'false'])

/**
 * The panel editor's current expression for (row, attribute): reads RAW from
 * the RowDetail (`detail.get('value')`) when possible, prefers raw over the
 * lossy `getValue()` facade reserialization. Bound into the AI Generator
 * dialog's `getCurrentExpression` prop (P1.3 AC2): called at Apply-click time
 * to decide whether the inline overwrite confirmation fires.
 *
 * Strategy: raw wins when non-empty — the XForm directly edited by the user.
 * For facade-backed attributes (relevant/constraint), the raw value is only
 * the facade's construction-time SEED; conditions built in the Skip Logic
 * panel update facade state but never call `model.set('value')`, so empty raw
 * means "unknown", not "empty". When raw is empty, consult the live
 * serialization to detect panel-built content. For Required, empty sentinels
 * ('', 'true', 'false', and boolean true/false) signal pristine or toggled
 * simple states that should not trigger confirmation.
 */
export function readCurrentExpression(row: any, attribute: string): string {
  const detail = row?.get?.(attribute)
  const raw = String(detail?.get?.('value') ?? '')
  if (attribute === 'required' && REQUIRED_EMPTY_SENTINELS.has(raw.trim())) {
    return ''
  }
  if (raw.trim() !== '') {
    return raw
  }
  // relevant/constraint: the raw value is only the facade's SEED — conditions
  // built in the panel update facade state, never model.set('value')
  // (view.rowDetail.coffee), so an empty raw is "unknown", not "empty".
  // Consult the live serialization purely for the emptiness decision; raw
  // wins whenever it has content, so the lossy reserialization is never
  // reported as the current expression. A throw propagates to the dialog's
  // fail-safe (assume non-empty, confirm).
  if (FACADE_ATTRIBUTES.has(attribute)) {
    return String(detail?.getValue?.() ?? '')
  }
  return raw
}

// Per-attribute expression input inside a settings drawer. Scoped to a `root`
// (the row's own `.card__settings`) by the caller so a second open drawer — or
// a group + child row rendering the same class — can't be hit (round-5 #2).
// The facade panels (relevant/constraint) have no single text input; focus
// their first interactive control inside `.skiplogic__main`.
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

// Fallback when a facade panel has no input at all: a fully-collapsed skip-logic
// panel renders only mode-selector <button>s in `.skiplogic__main` (round-5 #4).
// Tried only after the primary (real input) selector misses, so a populated
// panel always prefers its input over the "+ Add a condition" button.
const PANEL_INPUT_FALLBACK_SELECTORS: Partial<Record<string, string>> = {
  relevant: '.js-card-settings-relevant-logic .skiplogic__main button',
  constraint: '.js-card-settings-validation-criteria .skiplogic__main button',
}

/**
 * Move focus to the panel's expression input after Apply (P1.3 AC4): "Apply
 * closes the dialog and moves focus to the panel's expression field". The
 * dialog defers focus-on-close to the host — this is that hand-off. Call it
 * only after the dialog has unmounted and the builder's inert state is cleared
 * (focusing an inert element is a silent no-op). Pass the row's settings root
 * as `root` to disambiguate concurrently-open drawers (round-5 #2).
 */
export function focusPanelInput(attribute: string, root: ParentNode = document): boolean {
  const selector = PANEL_INPUT_SELECTORS[attribute]
  if (!selector) {
    return false
  }
  const el =
    root.querySelector<HTMLElement>(selector) ??
    (PANEL_INPUT_FALLBACK_SELECTORS[attribute]
      ? root.querySelector<HTMLElement>(PANEL_INPUT_FALLBACK_SELECTORS[attribute] as string)
      : null)
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
 * package no longer attempts its own focus restore — the host owns it. We do a
 * fresh lookup scoped to the attribute via the button's accessible name (set by
 * the package's GenerateButton), and to the row via `root` (round-5 #2), after
 * the dialog unmounts and inert clears.
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
