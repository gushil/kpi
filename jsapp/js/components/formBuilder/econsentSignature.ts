export const ECONSENT_SIGNATURE_EXTERNAL_VALUE = 'signature' as const

export type EConsentModuleStatus = 'ACTIVE' | 'PENDING' | string

/**
 * Event types for an event-form-definition context.
 * Only NONREPEATING_VISIT events are eligible for eConsent forms.
 */
export type FormEventType =
  | 'NONREPEATING_VISIT'
  | 'REPEATING_VISIT'
  | 'NONREPEATING_COMMON'
  | 'REPEATING_COMMON'
  | string

export function isEConsentEnabledStatus(status: EConsentModuleStatus | null | undefined): boolean {
  return status === 'ACTIVE' || status === 'PENDING'
}

/**
 * Returns true only for event types that are eligible to host an eConsent form.
 * Only non-repeating Visit events qualify; all Common events and Repeating Visit
 * events are ineligible.
 * Also returns true when eventType is null or undefined (no event context set,
 * e.g. Library editing), so the item type remains available outside event forms.
 */
export function isEConsentAllowedEventType(eventType: FormEventType | null | undefined): boolean {
  if (eventType === null || eventType === undefined) {
    return true
  }
  return eventType === 'NONREPEATING_VISIT'
}

function getHashQueryParam(name: string): string | null {
  const hash = window.location.hash
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return null
  return new URLSearchParams(hash.slice(queryIndex)).get(name)
}

const ECONSENT_KEY = 'oc.fd.econsent'
const EVENT_TYPE_KEY = 'oc.fd.eventType'

// Resolve sessionStorage once. Returns null when Web Storage is unavailable
// (e.g. blocked third-party context, opaque origin, or Safari ITP).
function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

const storage = getSessionStorage()

// At document load the URL is authoritative: Wekan always builds Library and
// Edit URLs with ?econsent when the module is on. A load without the param means
// the module is off for this context, so clear any value a previous document in
// this tab may have stored. Nothing after load may clear these values, because
// every param-less URL after load is a stripped one — React Router drops the
// hash query on any navigate(path) call that carries no query.
if (typeof window !== 'undefined') {
  const econsent = getHashQueryParam('econsent')
  if (econsent === null) {
    storage?.removeItem(ECONSENT_KEY)
    storage?.removeItem(EVENT_TYPE_KEY)
  } else {
    storage?.setItem(ECONSENT_KEY, econsent)
    storage?.setItem(EVENT_TYPE_KEY, getHashQueryParam('event_type') ?? '')
  }
}

/**
 * Returns the eConsent module status, reading the URL hash first and falling
 * back to the value stored in sessionStorage at document load.
 * The fallback is intentional: React Router drops ?econsent on any navigate()
 * call that carries no query, so after returning from the editor to the library
 * the URL is always param-less. sessionStorage survives that navigation and is
 * cleared on the next document load only when Wekan opens the page without
 * ?econsent (meaning the module is off for this context).
 */
export function getStudyEConsentModuleStatus(): string | null {
  return getHashQueryParam('econsent') ?? storage?.getItem(ECONSENT_KEY) ?? null
}

/**
 * Read the event type for the current form context from the URL query parameter
 * `event_type`, falling back to the value stored at document load alongside the
 * eConsent status. Returns null when the parameter was absent at load (e.g.
 * Library editing) or when the URL is stripped after navigation. An empty string
 * stored at load means the param was absent, which is mapped back to null so
 * the library case remains permitted.
 */
export function getFormEventType(): FormEventType | null {
  const live = getHashQueryParam('event_type')
  if (live !== null) return live
  const stored = storage?.getItem(EVENT_TYPE_KEY)
  // '' was stored when event_type was absent at load → treat as no event context
  return stored || null
}

/**
 * Gating for the eConsent Signature item type in Form Designer.
 * Requires both:
 *   1. The study eConsent module is ACTIVE or PENDING.
 *   2. The form is in a Non-Repeating Visit event (or no event context is set).
 * Existing signature rows continue to render regardless of this check.
 */
export function isEConsentSignatureItemTypeAllowed(): boolean {
  return isEConsentEnabledStatus(getStudyEConsentModuleStatus()) && isEConsentAllowedEventType(getFormEventType())
}

/**
 * Append ?econsent=… to a hash-router path (e.g. /library/asset/new).
 * Pass eConsentStatus from React Router searchParams when navigating; otherwise
 * reads from the current URL hash.
 */
export function appendEConsentQueryToPath(path: string, eConsentStatus?: string | null): string {
  const status = eConsentStatus ?? getStudyEConsentModuleStatus()
  const hashIndex = path.indexOf('#')
  const fragment = hashIndex === -1 ? '' : path.slice(hashIndex)
  const pathWithoutFragment = hashIndex === -1 ? path : path.slice(0, hashIndex)

  const queryIndex = pathWithoutFragment.indexOf('?')
  const pathname = queryIndex === -1 ? pathWithoutFragment : pathWithoutFragment.slice(0, queryIndex)
  const queryString = queryIndex === -1 ? '' : pathWithoutFragment.slice(queryIndex + 1)

  const params = new URLSearchParams(queryString)
  if (isEConsentEnabledStatus(status)) {
    params.set('econsent', status as string)
  } else {
    params.delete('econsent')
  }

  const query = params.toString()
  const base = query ? `${pathname}?${query}` : pathname
  return `${base}${fragment}`
}

/** Minimal router shape used by legacy withRouter() components. */
export type EConsentRouter = {
  searchParams: URLSearchParams
  navigate: (path: string) => void
}

export function getEConsentStatusFromRouter(router: EConsentRouter): string | null {
  return router.searchParams.get('econsent')
}

export function navigatePreservingEConsent(router: EConsentRouter, targetPath: string): void {
  router.navigate(appendEConsentQueryToPath(targetPath, getEConsentStatusFromRouter(router)))
}

/**
 * Build a #/… href with econsent preserved (for plain hash links in library tables).
 */
export function buildHashHrefWithEConsent(hashPath: string, eConsentStatus?: string | null): string {
  const path = hashPath.startsWith('#') ? hashPath.slice(1) : hashPath
  return `#${appendEConsentQueryToPath(path, eConsentStatus)}`
}

export function isEConsentSignatureRow(row: any): boolean {
  try {
    return row?.getValue?.('bind::oc:external') === ECONSENT_SIGNATURE_EXTERNAL_VALUE
  } catch {
    return false
  }
}

export function getEConsentSignatureCheckboxLabel(row: any): string {
  try {
    const list = row?.getList?.()
    const opt = list?.options?.at?.(0)
    if (!opt) return ''
    // Prefer the base 'label'; fall back to the first label::<lang> key found
    // so translated forms don't lose their display text.
    const base = opt.get?.('label')
    if (base != null && base !== '') return base as string
    const attrs: Record<string, unknown> = opt.attributes ?? {}
    for (const key of Object.keys(attrs)) {
      if (key.startsWith('label::') && attrs[key] !== '') {
        return attrs[key] as string
      }
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Enforce the internal structure required for OpenClinica eConsent signature items.
 *
 * Notes:
 * - This intentionally mutates the Backbone row and its related choice list.
 * - Call this after row.linkUp() so that getList() is available.
 */
export function ensureEConsentSignatureStructure(row: any, checkboxLabel: string): void {
  if (!row) return

  // Force type: select_multiple
  try {
    const typeDetail = row.get?.('type')
    typeDetail?.set?.('value', 'select_multiple')
  } catch {
    // ignore
  }

  // Force bind::oc:external = "signature"
  try {
    const external = row.get?.('bind::oc:external')
    external?.set?.('value', ECONSENT_SIGNATURE_EXTERNAL_VALUE)
  } catch {
    // ignore
  }

  // Force no item group
  try {
    const itemGroup = row.get?.('bind::oc:itemgroup')
    itemGroup?.set?.('value', '')
  } catch {
    // ignore
  }

  // Force exactly one response option with name "1"
  let list: any = null
  try {
    list = row.getList?.()
  } catch {
    list = null
  }
  if (!list?.options) return

  const label = (checkboxLabel ?? '').trim()

  // Mutate the existing first option in-place to preserve translation columns
  // and other metadata. Remove any extra options beyond the first.
  const existing = list.options.at?.(0)
  if (existing) {
    existing.set?.('name', '1')
    existing.set?.('label', label)
    const extras = list.options.slice?.(1)
    if (extras?.length) list.options.remove?.(extras)
  } else {
    list.options.add?.({ label, name: '1' })
    list.options.at?.(0)?.set?.('name', '1')
  }
}
