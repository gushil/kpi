/**
 * OC fork — P1.11 (OC-28699) bridge: runs the instant in-browser syntax check
 * and renders its verdict as messages beneath a logic panel's expression field.
 * Advisory only (AC2) — this never touches Save.
 */
import { FACADE_ATTRIBUTES, findPanelInputElement, readCurrentExpression } from './applyExpression'
import { checkSyntax } from './checkSyntax'
import { buildFormContext } from './logicBuilderContext'

export const SYNTAX_CHECK_MESSAGE_CLASS = 'js-syntax-check-message'

// Relevant/Constraint have no single input in general — their rule-builder
// mode has no combined-expression field at all. `.skiplogic__main` is the one
// anchor that survives every mode switch (B3), so apply-time messages always
// go there regardless of which mode is showing.
const FACADE_MAIN_SELECTORS: Partial<Record<string, string>> = {
  relevant: '.js-card-settings-relevant-logic .skiplogic__main',
  constraint: '.js-card-settings-validation-criteria .skiplogic__main',
}

/** Where the apply-time check (AC1) should render for `attribute`, across all six panels. */
export function findSyntaxCheckAnchor(attribute: string, root: ParentNode = document): Element | null {
  const facadeSelector = FACADE_MAIN_SELECTORS[attribute]
  if (facadeSelector) {
    return root.querySelector(facadeSelector)
  }
  return findPanelInputElement(attribute, root)
}

// Own class only — never the shared `.message` class some panels' pre-existing
// required/hint checks already toggle, or their own blur-time cleanup would
// delete our messages (and vice versa).
function clearMessages(anchor: Element): void {
  let next = anchor.nextElementSibling
  while (next && next.classList.contains(SYNTAX_CHECK_MESSAGE_CLASS)) {
    const toRemove = next
    next = next.nextElementSibling
    toRemove.remove()
  }
}

function renderMessages(anchor: Element, messages: readonly string[]): void {
  clearMessages(anchor)
  let insertAfter: Element = anchor
  for (const message of messages) {
    const div = document.createElement('div')
    div.className = SYNTAX_CHECK_MESSAGE_CLASS
    div.textContent = message
    insertAfter.insertAdjacentElement('afterend', div)
    insertAfter = div
  }
}

// For Relevant/Constraint, readCurrentExpression prefers the RAW stored
// value — correct for its own overwrite-confirmation purpose, but that raw
// value is only ever written by Apply, never by hand-code typing. Reading it
// here would validate stale text instead of what the user just typed, so
// facade attributes go straight to the live facade serialization instead.
function readExpressionToCheck(row: any, attribute: string): string {
  if (FACADE_ATTRIBUTES.has(attribute)) {
    return String(row?.get?.(attribute)?.getValue?.() ?? '')
  }
  return readCurrentExpression(row, attribute)
}

/**
 * Runs the check for (row, attribute) and (re-)renders its verdict right
 * after `anchor`. A re-check always replaces whatever it rendered last time;
 * no messages removes the block entirely. No-ops when `anchor` is null (the
 * panel isn't currently rendered).
 */
export function runSyntaxCheck(row: any, attribute: string, anchor: Element | null): void {
  if (!anchor) {
    return
  }
  const expression = readExpressionToCheck(row, attribute)
  if (!expression.trim()) {
    // An empty expression never has anything to flag — skip the whole-form
    // walk buildFormContext does, which is wasted work on every blur/apply.
    renderMessages(anchor, [])
    return
  }
  const messages = checkSyntax(expression, buildFormContext(row))
  renderMessages(anchor, messages)
}
