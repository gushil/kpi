/**
 * OC fork — P1.12 (OC-28781): AI generation usage analytics.
 *
 * Emits two UserPilot tracked events — one per generation request, one per
 * applied proposal — and carries the generation identifier between them via a
 * one-slot ledger. Everything here is fire-and-forget: nothing on the
 * authoring path awaits analytics, and every emitter is guarded so an
 * analytics bug can never alter a generation result or an Apply (AC4).
 * Payloads are the AC3 whitelist and nothing else — no prompt, no expression.
 *
 * The private @openclinica/logic-builder package is analytics-agnostic: the
 * host sees every trigger (generation through the injected GenerateClient,
 * Apply through onApply), so the emitter lives here (design.md §10).
 */
import type {
  ExpressionTab,
  FailureReason,
  GenerateClient,
  GenerationRequest,
  GenerationResult,
} from '@openclinica/logic-builder'
import userpilot from '#/userpilot'
import type { SyntaxErrorCategory } from './checkSyntax'

/** Event names are permanent in UserPilot (archive only) — agreed before the first production send. */
export const LOGIC_BUILDER_EVENTS = {
  generateRequest: 'logic_builder.generate.request',
  generateApply: 'logic_builder.generate.apply',
  syntaxVerdict: 'logic_builder.syntax.verdict',
} as const

export type LatencyBucket = '<1s' | '1-2s' | '2-3s' | '3-5s' | '5-10s' | '>10s'

/**
 * Lower bound inclusive. A stable binning for distribution charts alongside
 * the raw `latencyMs` (which UserPilot's Trends can also average directly);
 * the 3-5s / 5-10s bins straddle the 5 s p95 budget (design.md §6.4).
 */
export function latencyBucket(ms: number): LatencyBucket {
  if (ms < 1000) return '<1s'
  if (ms < 2000) return '1-2s'
  if (ms < 3000) return '2-3s'
  if (ms < 5000) return '3-5s'
  if (ms < 10000) return '5-10s'
  return '>10s'
}

interface UuidSource {
  randomUUID?: () => string
}

/**
 * Opaque per-generation id (AC1): RFC 4122 when the platform offers
 * crypto.randomUUID (secure contexts), else time+random base-36. Injectable
 * source for tests; never throws.
 */
export function newGenerationId(source: UuidSource | undefined = globalThis.crypto as UuidSource | undefined): string {
  try {
    if (source && typeof source.randomUUID === 'function') {
      return source.randomUUID()
    }
  } catch {
    // insecure context or exotic platform — use the fallback below
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export type GenerationOutcome = 'success' | FailureReason

// AC3 whitelist, enforced by type. These are type aliases (not interfaces) so
// they are assignable to userpilot.track's Record<string, AnalyticsValue>
// without an index signature — which is exactly what keeps an extra key such
// as `expression` a compile error at every emit site.
export type GenerateRequestEvent = {
  readonly attribute: ExpressionTab
  readonly itemName: string
  readonly generationId: string
  readonly outcome: GenerationOutcome
  readonly latencyMs: number
  readonly latencyBucket: LatencyBucket
}

export type GenerateApplyEvent =
  | { readonly attribute: ExpressionTab; readonly itemName: string; readonly generationId: string }
  // Ledger miss only (spec Decision 6): the event still goes out, without an id.
  | { readonly attribute: ExpressionTab; readonly itemName: string }

export interface LedgerEntry {
  readonly generationId: string
  readonly itemName: string
  readonly attribute: ExpressionTab
  readonly expression: string
}

// One slot: the open dialog's last successful generation. design.md D2 gives
// one dialog at a time; the dialog clears its proposal on any failure and
// applies only the displayed proposal, verbatim — so this entry is exactly the
// generation that produced whatever the host is asked to apply (spec §6).
let ledger: LedgerEntry | null = null

/** Called by the decorated client on a successful generation. */
export function recordGeneration(entry: LedgerEntry): void {
  ledger = entry
}

/** Called on dialog close (and by the decorator on a failed generation). */
export function clearGenerationLedger(): void {
  ledger = null
}

export interface ApplyScope {
  readonly itemName: string
  readonly attribute: ExpressionTab
  readonly expression: string
}

function warn(message: string, ...detail: unknown[]): void {
  console.warn(`Logic Builder analytics: ${message}`, ...detail)
}

/**
 * Emit the apply event for the proposal the host just persisted (AC2). Returns
 * the generation id so P1.13 can stamp the post-Apply verdict; `undefined` on a
 * ledger miss — unreachable while the dialog applies only its displayed
 * proposal — in which case the event still goes out without an id and a
 * warning names the gap (spec Decision 6). The slot is retained: a rejected
 * Apply keeps the dialog open for a retry; the host clears the ledger on close.
 * The id is returned even if event delivery throws (P1.13 consumes it).
 */
export function emitGenerateApply(scope: ApplyScope): string | undefined {
  let generationId: string | undefined
  try {
    generationId =
      ledger !== null &&
      ledger.itemName === scope.itemName &&
      ledger.attribute === scope.attribute &&
      ledger.expression === scope.expression
        ? ledger.generationId
        : undefined
    if (generationId === undefined) {
      warn('apply had no matching generation in the ledger', scope.attribute, scope.itemName)
    }
    const event: GenerateApplyEvent =
      generationId === undefined
        ? { attribute: scope.attribute, itemName: scope.itemName }
        : { attribute: scope.attribute, itemName: scope.itemName, generationId }
    userpilot.track(LOGIC_BUILDER_EVENTS.generateApply, event)
  } catch (e) {
    warn('apply emission failed', e)
  }
  return generationId
}

// A keyed map rather than an array: `satisfies Record<FailureReason, true>`
// turns a reason the package adds later into a compile error here, so
// analytics can never quietly record it as `unavailable` while the dialog
// renders it correctly.
const FAILURE_REASONS = {
  insufficient_detail: true,
  invalid_reference: true,
  other_prompt_issue: true,
  non_validated_function: true,
  unavailable: true,
} satisfies Record<FailureReason, true>

function isFailureReason(value: unknown): value is FailureReason {
  // hasOwnProperty (not `in`) so a hostile shape cannot reach the prototype
  // chain — the same guard the dialog's normalizeReason uses.
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(FAILURE_REASONS, value)
}

/**
 * Fail-safe polarity, mirroring the dialog: only an explicit success with a
 * usable expression counts as success; an unrecognised reason or shape reads
 * as unavailable. The metric must classify exactly as the user experienced it.
 */
function outcomeOf(result: GenerationResult): GenerationOutcome {
  const shape = result as Partial<{ kind: unknown; expression: unknown; reason: unknown }> | null | undefined
  if (shape?.kind === 'success') {
    return typeof shape.expression === 'string' && shape.expression.trim() !== '' ? 'success' : 'unavailable'
  }
  const reason = shape?.reason
  return isFailureReason(reason) ? reason : 'unavailable'
}

// Matched on the name, like the package's httpClient: an abort can arrive as
// any object named AbortError, cross-realm DOMExceptions included.
function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'
}

/** Run analytics bookkeeping so that nothing it does can escape to the caller (AC4). */
function guarded(work: () => void): void {
  try {
    work()
  } catch (e) {
    warn('emission failed', e)
  }
}

function emitRequest(
  req: GenerationRequest,
  generationId: string,
  outcome: GenerationOutcome,
  latencyMs: number,
): void {
  const event: GenerateRequestEvent = {
    attribute: req.attribute,
    itemName: req.targetFieldName,
    generationId,
    outcome,
    latencyMs,
    latencyBucket: latencyBucket(latencyMs),
  }
  userpilot.track(LOGIC_BUILDER_EVENTS.generateRequest, event)
}

/**
 * Decorate a GenerateClient with P1.12 emission (AC1). The inner client's
 * promise settles exactly as before — the same result by identity, the same
 * rejection — and every piece of bookkeeping is guarded, so analytics can
 * never change what the dialog sees (AC4).
 *
 * - success → request event + ledger entry for the Apply that may follow
 * - labeled failure / malformed result → request event with that outcome, ledger cleared
 *   (the dialog clears its proposal on any failure)
 * - AbortError → rethrown, nothing emitted (a superseded or cancelled request has no outcome)
 * - any other rejection → request event with outcome `unavailable`, then rethrown
 */
export function withGenerationAnalytics(inner: GenerateClient): GenerateClient {
  return {
    async generate(req, opts) {
      const generationId = newGenerationId()
      const started = performance.now()
      let result: GenerationResult
      try {
        result = await inner.generate(req, opts)
      } catch (error) {
        if (!isAbortError(error)) {
          guarded(() => {
            clearGenerationLedger()
            emitRequest(req, generationId, 'unavailable', Math.round(performance.now() - started))
          })
        }
        throw error
      }
      guarded(() => {
        const latencyMs = Math.round(performance.now() - started)
        const outcome = outcomeOf(result)
        if (outcome === 'success' && result.kind === 'success') {
          recordGeneration({
            generationId,
            itemName: req.targetFieldName,
            attribute: req.attribute,
            expression: result.expression,
          })
        } else {
          clearGenerationLedger()
        }
        emitRequest(req, generationId, outcome, latencyMs)
      })
      return result
    },
  }
}

// ---------------------------------------------------------------------------
// P1.13 — instant syntax-check verdicts (OC-28782)
// ---------------------------------------------------------------------------

// AC3 whitelist, enforced by type (a type alias for the same reason as the
// P1.12 events). Every key is always present so the shape is one object, not
// a union: `errorCategories` is '' and `generationId` is null when they do
// not apply — null is a UserPilot primitive, and a constant key set keeps the
// dashboard's attribute list stable.
export type SyntaxVerdictEvent = {
  readonly attribute: ExpressionTab
  readonly itemName: string
  readonly verdict: 'valid' | 'invalid'
  readonly errorCategories: string // '|'-joined SyntaxErrorCategory list, '' when valid
  readonly errorCount: number
  readonly afterAiApply: boolean
  readonly generationId: string | null // only after an AI Apply, when the ledger matched
}

export interface SyntaxVerdictInput {
  readonly itemName: string
  readonly attribute: ExpressionTab
  /**
   * Stable identity of the row for the dedupe memory (the Backbone cid). Falls
   * back to `itemName`, but an unnamed new question has an empty name, so two
   * unnamed questions would otherwise share one slot; a rename keeps the slot.
   */
  readonly rowKey?: string
  /** The checked expression — used ONLY to suppress repeat verdicts; never emitted. */
  readonly expression: string
  readonly categories: readonly SyntaxErrorCategory[]
  /** Present when the check follows an AI Apply (P1.13 AC2); forces emission. */
  readonly afterAiApply?: { readonly generationId?: string }
}

// The last expression a verdict was emitted for, per item + attribute. A blur
// that re-checks unchanged text emits nothing (PRD P1.13 AC1, 2026-09-18), so a
// verdict counts a distinct authored state, not a focus change. Expression text
// lives here only; it never enters a payload.
const lastVerdictExpression = new Map<string, string>()

function verdictKey(rowKey: string, attribute: ExpressionTab): string {
  return `${rowKey}\u0000${attribute}`
}

/**
 * Forget one row+attribute (the same `rowKey` the verdict was emitted with, or
 * the item name when the row had none), e.g. when its expression was cleared,
 * so retyping the same text counts again.
 */
export function forgetSyntaxVerdict(rowKey: string, attribute: ExpressionTab): void {
  lastVerdictExpression.delete(verdictKey(rowKey, attribute))
}

/** Called when the form is closed. */
export function clearSyntaxVerdictMemory(): void {
  lastVerdictExpression.clear()
}

/**
 * Emit the verdict of one instant syntax check (AC1), unless the expression is
 * unchanged since the last verdict for this item and attribute. A post-Apply
 * check always emits, marked and stamped with the applied generation's id
 * (AC2), and resets the memory so the blur that usually follows Apply is
 * silent. Fire-and-forget and guarded (AC3).
 */
export function emitSyntaxVerdict(input: SyntaxVerdictInput): void {
  try {
    const key = verdictKey(input.rowKey ?? input.itemName, input.attribute)
    if (!input.afterAiApply && lastVerdictExpression.get(key) === input.expression) {
      return
    }
    lastVerdictExpression.set(key, input.expression)
    const event: SyntaxVerdictEvent = {
      attribute: input.attribute,
      itemName: input.itemName,
      verdict: input.categories.length === 0 ? 'valid' : 'invalid',
      errorCategories: input.categories.join('|'),
      errorCount: input.categories.length,
      afterAiApply: input.afterAiApply !== undefined,
      generationId: input.afterAiApply?.generationId ?? null,
    }
    userpilot.track(LOGIC_BUILDER_EVENTS.syntaxVerdict, event)
  } catch (e) {
    warn('syntax verdict emission failed', e)
  }
}
