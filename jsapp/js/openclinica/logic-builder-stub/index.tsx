/**
 * OC fork — CI-only stand-in for the PRIVATE `@openclinica/logic-builder` package.
 *
 * `@openclinica/logic-builder` is an optionalDependency pinned to a private git
 * ref. The public GitHub Actions CI (fork PRs, no secrets) can't clone it, so
 * it's absent there. This stub is resolved ONLY when the real package isn't
 * installed — see the presence-based fallbacks in `tsconfig.json` (`paths`),
 * `webpack/webpack.common.js` (`resolve.alias`), and `jsapp/jest/unit.config.ts`
 * (`moduleNameMapper`) — so type-check / build / unit tests stay green over all
 * of kpi's own code without the private source.
 *
 * Local dev and the Jenkins/production image install the REAL package and never
 * see this stub (the Dockerfile hard-fails if the real one is missing). The
 * exported TYPES mirror the package's public surface faithfully so kpi's code is
 * still type-checked in CI; the two components are inert (never rendered in CI).
 * Keep in sync with the pinned logic-builder version.
 */
import type { RefObject } from 'react'

export type ExpressionTab =
  | 'calculation'
  | 'default'
  | 'constraint'
  | 'required'
  | 'relevant'
  | 'repeatCount'

export interface FormFieldChoice {
  readonly value: string
  readonly label: string
}

export interface FormField {
  readonly name: string
  readonly type: string
  readonly label: string
  readonly choices?: readonly FormFieldChoice[]
}

export interface FormFieldContext {
  readonly fields: readonly FormField[]
}

export interface GenerationRequest {
  readonly prompt: string
  readonly attribute: ExpressionTab
  readonly targetFieldName: string
  readonly fields: FormFieldContext
  readonly currentExpression: string
}

export interface GenerationSuccess {
  readonly kind: 'success'
  readonly expression: string
}

export interface GenerationFailure {
  readonly kind: 'failure'
  readonly error: string
}

export type GenerationResult = GenerationSuccess | GenerationFailure

export interface GenerateClient {
  generate(req: GenerationRequest, opts?: { readonly signal?: AbortSignal }): Promise<GenerationResult>
}

export const ATTRIBUTE_LABELS: Record<ExpressionTab, string> = {
  calculation: 'Calculation',
  default: 'Default Value',
  constraint: 'Constraint Logic',
  required: 'Required Logic',
  relevant: 'Relevant Logic',
  repeatCount: 'Repeat Count',
}

export interface GenerateButtonProps {
  readonly attribute: ExpressionTab
  readonly onOpen: () => void
  readonly disabled?: boolean
}

// Inert stand-in — CI never renders this; the real package supplies the UI.
export function GenerateButton(_props: GenerateButtonProps): JSX.Element | null {
  return null
}

export interface AiGeneratorDialogProps {
  readonly open: boolean
  readonly scope: {
    readonly itemName: string
    readonly attribute: ExpressionTab
    readonly fields: FormFieldContext
    readonly currentExpression: string
  }
  readonly client: GenerateClient
  readonly inertRoot?: RefObject<HTMLElement> | HTMLElement | null
  readonly container?: HTMLElement | null
  readonly onApply: (expression: string) => boolean | Promise<boolean>
  readonly onClose: () => void
}

export function AiGeneratorDialog(_props: AiGeneratorDialogProps): JSX.Element | null {
  return null
}
