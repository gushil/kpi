/**
 * OC fork — P1.2 (OC-28277): read the form + target-item context for the AI
 * Generator out of the Backbone/xlform models (PRD P1.2 AC2). Best-effort:
 * every read is guarded so a hostile model degrades to '' rather than
 * breaking the dialog.
 */
import type {
  ExpressionTab,
  FormField,
  FormFieldChoice,
  FormFieldContext,
  ItemDefinition,
} from '@openclinica/logic-builder'

/** ExpressionTab -> xlform RowDetail column (repeat_count is the one rename).
 * The inverse direction lives in `logicBuilderTabs`' COLUMN_TO_TAB. */
const TAB_TO_COLUMN: Record<ExpressionTab, string> = {
  calculation: 'calculation',
  default: 'default',
  constraint: 'constraint',
  required: 'required',
  relevant: 'relevant',
  repeatCount: 'repeat_count',
}

/**
 * Choice list of a select row, as value/label pairs. Non-select rows (and
 * groups, whose `_isSelectQuestion()` is hardcoded false) have none. In xlform
 * an option model's `name` is the stored VALUE, its `label` the display text.
 */
function readRowChoices(row: any): FormFieldChoice[] | undefined {
  try {
    if (typeof row._isSelectQuestion !== 'function' || !row._isSelectQuestion()) {
      return undefined
    }
    const models = row.getList?.()?.options?.models
    if (!Array.isArray(models) || models.length === 0) {
      return undefined
    }
    return models.map((opt: any) => ({
      value: String(opt?.get?.('name') ?? ''),
      label: String(opt?.get?.('label') ?? ''),
    }))
  } catch (e) {
    console.warn('Logic Builder: failed to read choices for AI context', e)
    return undefined
  }
}

/**
 * OC fork (P1.1, extended in P1.2): best-effort read of the survey's fields to
 * give the AI Generator dialog its form context — now including groups and each
 * select's choice list (P1.2 AC2). Any failure here is non-fatal: we fall back
 * to an empty field list rather than blocking a generation.
 */
export function buildFieldContext(row: any): FormFieldContext {
  try {
    const survey = row?.getSurvey?.()
    if (!survey?.forEachRow) {
      return { fields: [] }
    }
    // Mutable local we build up, then hand off as the readonly context field.
    const fields: FormField[] = []
    survey.forEachRow(
      (r: any) => {
        let name = ''
        try {
          name = r.getValue('name') || ''
        } catch (e) {
          console.warn('Logic Builder: failed to read a field name for AI context', e)
          name = ''
        }
        if (!name) {
          return
        }
        let type = ''
        try {
          type = String(r.getValue('type') || '')
        } catch (e) {
          console.warn('Logic Builder: failed to read a field type for AI context', e)
          type = ''
        }
        let label = ''
        try {
          const rawLabel = r.getValue('label')
          label = Array.isArray(rawLabel) ? String(rawLabel[0] ?? '') : String(rawLabel ?? '')
        } catch (e) {
          console.warn('Logic Builder: failed to read a field label for AI context', e)
          label = ''
        }
        const choices = readRowChoices(r)
        fields.push(choices ? { name, type, label, choices } : { name, type, label })
      },
      // includeGroups: true (P1.2 AC2) — group and repeat rows come through as
      // fields carrying the xlform group type ('group' / 'repeat' /
      // 'kobomatrix'), so the AI sees the form's structure, not just its leaves.
      { includeGroups: true },
    )
    return { fields }
  } catch (e) {
    console.warn('Logic Builder: failed to build field context; using empty list', e)
    return { fields: [] }
  }
}

function readRowString(row: any, key: string): string {
  try {
    const raw = row.getValue(key)
    return Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '')
  } catch (e) {
    console.warn('Logic Builder: failed to read item attribute for AI context', key, e)
    return ''
  }
}

/**
 * The scoped item's name — the one reader for it, shared by the AI Generator
 * dialog's header and the item definition sent to the model, so the two can
 * never disagree about which item is scoped. Unlike `readRowString` it falls
 * back to the row's `name` detail model when `getValue` yields nothing: a row
 * mid-edit can hold the name only there, and an empty `- name:` in the prompt
 * would silently strip the target item's identity. Name-only on purpose —
 * `type` and `label` hold different value shapes in their detail models.
 */
export function readItemName(row: any): string {
  try {
    return String(row.getValue?.('name') || row.get?.('name')?.get?.('value') || '')
  } catch (e) {
    console.warn('Logic Builder: failed to read the item name for AI context', e)
    return ''
  }
}

/**
 * The scoped item in full: identity, choice list, and the current expression of
 * every logic attribute — sent unconditionally, so the model can reason about
 * the logic already on the item (P1.2 AC2).
 */
export function buildItemDefinition(row: any): ItemDefinition {
  const logic = {
    calculation: '',
    default: '',
    constraint: '',
    required: '',
    relevant: '',
    repeatCount: '',
  } as Record<ExpressionTab, string>
  for (const tab of Object.keys(TAB_TO_COLUMN) as ExpressionTab[]) {
    try {
      logic[tab] = row.get(TAB_TO_COLUMN[tab])?.get?.('value') || ''
    } catch (e) {
      console.warn('Logic Builder: failed to read a logic column for AI context', tab, e)
      logic[tab] = ''
    }
  }
  return {
    name: readItemName(row),
    type: readRowString(row, 'type'),
    label: readRowString(row, 'label'),
    choices: readRowChoices(row),
    logic,
  }
}
