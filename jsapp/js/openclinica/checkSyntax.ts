/**
 * P1.11 instant in-browser syntax check: a pure, no-network scan for five
 * definite error conditions (AC4-AC8) — unbalanced parens/brackets/item-ref
 * braces, an unterminated string, an unknown item reference. Never flags
 * anything a real form would accept.
 */
export interface SyntaxCheckRow {
  readonly name: string
  readonly kind: 'question' | 'group'
  readonly rows?: readonly SyntaxCheckRow[]
}

export interface SyntaxCheckFormContext {
  readonly rows: readonly SyntaxCheckRow[]
}

const ITEM_NAME_CHAR = /[A-Za-z0-9_.-]/

function collectItemNames(rows: readonly SyntaxCheckRow[], names: Set<string>): void {
  for (const row of rows) {
    if (row.name) names.add(row.name)
    if (row.kind === 'group' && row.rows) collectItemNames(row.rows, names)
  }
}

const MISSING_OPEN_PAREN =
  'Missing opening parenthesis "(" for existing closing parenthesis ")". Parentheses must be used in pairs in logical groupings and function calls.'
const MISSING_CLOSE_PAREN =
  'Missing closing parenthesis ")" for existing opening parenthesis "(". Parentheses must be used in pairs in logical groupings and function calls.'
const MISSING_OPEN_BRACKET =
  'Missing opening bracket "[" for existing closing bracket "]". Brackets must be used in pairs in logical groupings.'
const MISSING_CLOSE_BRACKET =
  'Missing closing bracket "]" for existing opening bracket "[". Brackets must be used in pairs in logical groupings.'
const MISSING_OPEN_BRACE = 'Missing { in item reference. Item references must use braces in pairs like: ${itemname}'
const MISSING_CLOSE_BRACE = 'Missing } in item reference. Item references must use braces in pairs like: ${itemname}'

// Tracks one symmetric open/close pair (parens, brackets, or braces): depth
// counts unmatched opens; a stray close (depth already 0) is remembered
// separately, since both can be true at once (e.g. ")(").
class Balance {
  depth = 0
  sawUnmatchedClose = false
  open(): void {
    this.depth++
  }
  close(): void {
    if (this.depth > 0) this.depth--
    else this.sawUnmatchedClose = true
  }
  messages(openMsg: string, closeMsg: string): string[] {
    const out: string[] = []
    if (this.sawUnmatchedClose) out.push(openMsg)
    if (this.depth > 0) out.push(closeMsg)
    return out
  }
}

export function checkSyntax(expression: string, form: SyntaxCheckFormContext): readonly string[] {
  const parens = new Balance()
  const brackets = new Balance()
  const braces = new Balance()
  let refCapture: string | null = null // characters captured since the current `${`, or null when not in one
  const invalidRefs = new Set<string>()

  const itemNames = new Set<string>()
  collectItemNames(form.rows, itemNames)

  let quote: "'" | '"' | null = null

  for (let i = 0; i < expression.length; i++) {
    const ch = expression[i]

    if (quote) {
      if (ch === quote) quote = null
      continue
    }

    if (ch === "'" || ch === '"') {
      quote = ch
      continue
    }

    if (ch === '$' && expression[i + 1] === '{') {
      braces.open()
      refCapture = ''
      i++ // consume the '{'
      continue
    }
    if (ch === '}') {
      const wasOpen = braces.depth > 0
      braces.close()
      if (wasOpen && refCapture && itemNames.size > 0 && !itemNames.has(refCapture)) {
        invalidRefs.add(refCapture)
      }
      refCapture = null
      continue
    }
    if (refCapture !== null) {
      if (ITEM_NAME_CHAR.test(ch)) {
        refCapture += ch
      } else {
        refCapture = null // not a well-formed name — leave it to the brace/paren counters, never AC8
      }
    }

    if (ch === '(') {
      parens.open()
      continue
    }
    if (ch === ')') {
      parens.close()
      continue
    }

    if (ch === '[') {
      brackets.open()
      continue
    }
    if (ch === ']') {
      brackets.close()
    }
  }

  const messages: string[] = [
    ...parens.messages(MISSING_OPEN_PAREN, MISSING_CLOSE_PAREN),
    ...brackets.messages(MISSING_OPEN_BRACKET, MISSING_CLOSE_BRACKET),
  ]
  if (quote === "'") {
    messages.push(
      "Missing ' for text value. Literal text values must either start and end with a single quote character (') or start and end with a double quote character (\").",
    )
  }
  if (quote === '"') {
    messages.push(
      'Missing " for text value. Literal text values must either start and end with a double quote character (") or start and end with a single quote character (\').',
    )
  }
  messages.push(...braces.messages(MISSING_OPEN_BRACE, MISSING_CLOSE_BRACE))
  for (const name of invalidRefs) {
    messages.push(
      `Invalid item reference \${${name}}. There is no item on this form with item name defined as ${name}.`,
    )
  }

  return messages
}
