import chai from 'chai'

import { type SyntaxCheckFormContext, checkSyntax } from './checkSyntax'

const MISSING_OPEN_PAREN =
  'Missing opening parenthesis "(" for existing closing parenthesis ")". Parentheses must be used in pairs in logical groupings and function calls.'
const MISSING_CLOSE_PAREN =
  'Missing closing parenthesis ")" for existing opening parenthesis "(". Parentheses must be used in pairs in logical groupings and function calls.'
const MISSING_OPEN_BRACKET =
  'Missing opening bracket "[" for existing closing bracket "]". Brackets must be used in pairs in logical groupings.'
const MISSING_CLOSE_BRACKET =
  'Missing closing bracket "]" for existing opening bracket "[". Brackets must be used in pairs in logical groupings.'
const MISSING_SINGLE_QUOTE =
  "Missing ' for text value. Literal text values must either start and end with a single quote character (') or start and end with a double quote character (\")."
const MISSING_DOUBLE_QUOTE =
  'Missing " for text value. Literal text values must either start and end with a double quote character (") or start and end with a single quote character (\').'
const MISSING_OPEN_BRACE = 'Missing { in item reference. Item references must use braces in pairs like: ${itemname}'
const MISSING_CLOSE_BRACE = 'Missing } in item reference. Item references must use braces in pairs like: ${itemname}'

function invalidItemRef(name: string): string {
  return `Invalid item reference \${${name}}. There is no item on this form with item name defined as ${name}.`
}

const emptyForm: SyntaxCheckFormContext = { rows: [] }

const bmiForm: SyntaxCheckFormContext = {
  rows: [
    { kind: 'question', name: 'WEIGHT' },
    { kind: 'question', name: 'HEIGHT' },
  ],
}

describe('checkSyntax (P1.11 AC4-AC8)', () => {
  it('returns no messages for a clean expression referencing only valid items', () => {
    chai.expect(checkSyntax('${WEIGHT} div (${HEIGHT} * ${HEIGHT})', bmiForm)).to.deep.equal([])
  })

  it('flags a missing closing parenthesis (mockup §13 frame B)', () => {
    chai.expect(checkSyntax('${WEIGHT} div (${HEIGHT} * ${HEIGHT}', bmiForm)).to.deep.equal([MISSING_CLOSE_PAREN])
  })

  it('flags a missing opening parenthesis', () => {
    chai.expect(checkSyntax('${WEIGHT})', bmiForm)).to.deep.equal([MISSING_OPEN_PAREN])
  })

  it('flags both paren variants together when both directions are unbalanced', () => {
    chai.expect(checkSyntax(')(', emptyForm)).to.deep.equal([MISSING_OPEN_PAREN, MISSING_CLOSE_PAREN])
  })

  it('flags a missing closing bracket', () => {
    chai.expect(checkSyntax('${loop[position()=1}', emptyForm)).to.deep.equal([MISSING_CLOSE_BRACKET])
  })

  it('flags a missing opening bracket', () => {
    chai.expect(checkSyntax('position()=1]', emptyForm)).to.deep.equal([MISSING_OPEN_BRACKET])
  })

  it('flags an unterminated single-quoted string', () => {
    chai.expect(checkSyntax("${STATUS} = 'active", emptyForm)).to.deep.equal([MISSING_SINGLE_QUOTE])
  })

  it('flags an unterminated double-quoted string', () => {
    chai.expect(checkSyntax('${STATUS} = "active', emptyForm)).to.deep.equal([MISSING_DOUBLE_QUOTE])
  })

  it('does not flag an apostrophe inside a double-quoted literal (risk-details false-positive guard)', () => {
    chai.expect(checkSyntax('${NOTE} = "don\'t"', emptyForm)).to.deep.equal([])
  })

  it('does not flag parens/brackets that appear inside a string literal', () => {
    chai.expect(checkSyntax('${NOTE} = "smiley :) [ok]"', emptyForm)).to.deep.equal([])
  })

  it('flags an invalid item reference (mockup §13 frame A)', () => {
    chai.expect(checkSyntax('${WEIGHT} div (${HIEGHT} * ${HEIGHT})', bmiForm)).to.deep.equal([invalidItemRef('HIEGHT')])
  })

  it('flags a missing closing brace in an item reference', () => {
    chai.expect(checkSyntax('${WEIGHT', bmiForm)).to.deep.equal([MISSING_CLOSE_BRACE])
  })

  it('flags a missing opening brace in an item reference', () => {
    chai.expect(checkSyntax('WEIGHT}', bmiForm)).to.deep.equal([MISSING_OPEN_BRACE])
  })

  it('does not flag ${...}-shaped text inside a string literal (risk-details false-positive guard)', () => {
    chai.expect(checkSyntax('${WEIGHT} = "${notareal}"', bmiForm)).to.deep.equal([])
  })

  it('does not invent an AC8 message from a broken reference capture (round-1 review A1)', () => {
    // Parens and braces each balance structurally here, so none of AC4-AC8's
    // enumerated conditions actually apply — the strict-subset design must
    // not report anything invented beyond them, even though 'A) + 1' is
    // nonsense as an item name.
    chai.expect(checkSyntax('foo(${A) + 1}', emptyForm)).to.deep.equal([])
  })

  it('finds item references nested inside groups (recursive name walk)', () => {
    const nestedForm: SyntaxCheckFormContext = {
      rows: [
        {
          kind: 'group',
          name: 'GRP',
          rows: [{ kind: 'question', name: 'CHILD' }],
        },
      ],
    }
    chai.expect(checkSyntax('${CHILD}', nestedForm)).to.deep.equal([])
  })

  it('never flags AC8 when the form context has no known item names (round-1 review A2)', () => {
    chai.expect(checkSyntax('${ANYTHING}', emptyForm)).to.deep.equal([])
  })

  it('displays multiple distinct error conditions together (AC3)', () => {
    chai.expect(checkSyntax('(${HIEGHT}', bmiForm)).to.deep.equal([MISSING_CLOSE_PAREN, invalidItemRef('HIEGHT')])
  })
})
