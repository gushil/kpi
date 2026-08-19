import chai from 'chai'
import { applyExpressionToRow, focusGenerateButton, focusPanelInput, readCurrentExpression } from './applyExpression'

// Minimal Backbone-ish fakes: a row hands out a RowDetail via get(attribute)
// and its survey via getSurvey(); the detail exposes set()/getValue().
function makeRow(options: { detail?: any; survey?: any } = {}) {
  const detail = 'detail' in options ? options.detail : { set: jest.fn(), getValue: jest.fn() }
  const survey = 'survey' in options ? options.survey : { trigger: jest.fn() }
  const row = {
    get: jest.fn(() => detail),
    getSurvey: jest.fn(() => survey),
  }
  return { row, detail, survey }
}

// A facade-backed RowDetail modeled faithfully: `get('value')` returns the RAW
// stored attribute (updated by set), while `getValue()` returns the facade's
// re-serialization of the current raw value — the lossy round-trip that drops
// clauses it can't resolve and reformats the rest (round-7). `serialize` is the
// per-test facade behavior.
function makeFacadeRow(opts: { raw?: string; serialize?: (raw: string) => string } = {}) {
  const serialize = opts.serialize ?? ((raw: string) => raw)
  let value = opts.raw ?? ''
  const set = jest.fn((_key: string, v: string) => {
    value = v
  })
  const detail = {
    set,
    get: jest.fn((key: string) => (key === 'value' ? value : undefined)),
    getValue: jest.fn(() => serialize(value)),
  }
  const made = makeRow({ detail })
  return { ...made, rawValue: () => value }
}

describe('applyExpressionToRow (P1.3)', () => {
  let errorSpy: jest.SpyInstance
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    errorSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('reports missing-detail when the row has no RowDetail for the attribute', () => {
    const { row } = makeRow({ detail: undefined })
    const outcome = applyExpressionToRow(row, 'calculation', '1 + 1')
    chai.expect(outcome).to.deep.equal({ status: 'error', reason: 'missing-detail' })
  })

  it('reports detached-row when getSurvey() returns null, without writing', () => {
    const { row, detail } = makeRow({ survey: null })
    const outcome = applyExpressionToRow(row, 'calculation', '1 + 1')
    chai.expect(outcome).to.deep.equal({ status: 'error', reason: 'detached-row' })
    chai.expect(detail.set.mock.calls.length).to.equal(0)
  })

  it('strips newlines for calculation, writes via the RowDetail, and triggers a survey change', () => {
    const { row, detail, survey } = makeRow()
    const outcome = applyExpressionToRow(row, 'calculation', '${A}\n + \r\n${B}')
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
    chai.expect(detail.set.mock.calls).to.deep.equal([['value', '${A}  +  ${B}']])
    chai.expect(survey.trigger.mock.calls).to.deep.equal([['change']])
  })

  it('strips newlines for required too — its panel input is single-line (round-5 #7)', () => {
    const { row, detail } = makeRow()
    applyExpressionToRow(row, 'required', '${A} = 1\nand ${B} = 2')
    chai.expect(detail.set.mock.calls[0][1]).to.equal('${A} = 1 and ${B} = 2')
  })

  it('joins newline-separated tokens with a space, never concatenating them (PR#273 deferred)', () => {
    const { row, detail } = makeRow()
    applyExpressionToRow(row, 'calculation', '${A} = 1\nand ${B} = 2')
    chai.expect(detail.set.mock.calls).to.deep.equal([['value', '${A} = 1 and ${B} = 2']])
  })

  it('keeps newlines for relevant (manual entry keeps them there too)', () => {
    // Stored form keeps both field refs → a clean apply, newlines preserved.
    const { row, detail } = makeFacadeRow()
    const outcome = applyExpressionToRow(row, 'relevant', '${A} = 1\nand ${B} = 2')
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
    chai.expect(detail.set.mock.calls[0][1]).to.equal('${A} = 1\nand ${B} = 2')
  })

  it('does not flag a date() wrapper the serializer adds (round-5 #3 false positive)', () => {
    // DateOperator wraps a bare date literal in date('…') on serialize; the
    // field ref ${visit_date} survives, so this is a clean apply, not a drop.
    const { row } = makeFacadeRow({ serialize: () => "${visit_date} > date('2024-01-01')" })
    const outcome = applyExpressionToRow(row, 'constraint', "${visit_date} > '2024-01-01'")
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
  })

  it('does not flag quotes the serializer adds around an unquoted value (round-5 #3)', () => {
    // TextOperator wraps an unquoted value in quotes; ${subject_code} survives.
    const { row } = makeFacadeRow({ serialize: () => "${subject_code} = '123'" })
    const outcome = applyExpressionToRow(row, 'constraint', '${subject_code} = 123')
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
  })

  it('refuses and reverts a partial clause-drop, reporting the unresolved refs (round-5 #5)', () => {
    // The facade dropped the ${NOPE} clause it could not resolve. Rather than
    // persist a silently-reduced expression, restore the previous value and
    // report a rejection.
    const previous = '${A} = 1'
    const dropNope = (raw: string) => raw.replace(/ and \$\{NOPE\} = 2/, '')
    const { row, detail } = makeFacadeRow({ raw: previous, serialize: dropNope })
    const outcome = applyExpressionToRow(row, 'constraint', '${A} = 1 and ${NOPE} = 2')
    chai.expect(outcome).to.deep.equal({
      status: 'rejected',
      intended: '${A} = 1 and ${NOPE} = 2',
      stored: '${A} = 1',
      unresolved: ['${NOPE}'],
    })
    // Wrote the attempt, then restored the previous value (revert).
    chai.expect(detail.set.mock.calls).to.deep.equal([
      ['value', '${A} = 1 and ${NOPE} = 2'],
      ['value', previous],
    ])
  })

  it('refuses and reverts a total clause-drop', () => {
    const { row, detail } = makeFacadeRow({ serialize: (raw) => (raw.includes('${AGE}') ? '' : raw) })
    const outcome = applyExpressionToRow(row, 'relevant', '${AGE} >= 18')
    chai.expect(outcome.status).to.equal('rejected')
    chai.expect((outcome as any).unresolved).to.deep.equal(['${AGE}'])
    chai.expect(detail.set.mock.calls).to.deep.equal([
      ['value', '${AGE} >= 18'],
      ['value', ''],
    ])
  })

  it("reverts to the RAW stored text, never the facade's reserialization of it (round-7)", () => {
    // The pre-existing raw value ALREADY holds a clause the facade drops on its
    // own serialize pass (${typo_field} — deleted/renamed on the form). A
    // rejected apply must restore exactly that raw text: capturing `previous`
    // via getValue() would restore the facade's reduced round-trip and silently
    // lose the clause while the toast claims nothing changed.
    const raw = '${real_field} = 1 and ${typo_field} = 2'
    const lossy = (s: string) => s.replace(/ and \$\{typo_field\} = 2/, '').replace(/\$\{AGE\} >= 18/, '')
    const { row, detail, rawValue } = makeFacadeRow({ raw, serialize: lossy })
    const outcome = applyExpressionToRow(row, 'relevant', '${AGE} >= 18')
    chai.expect(outcome.status).to.equal('rejected')
    // The revert wrote the raw original — clause intact — not the lossy form.
    chai.expect(detail.set.mock.calls[detail.set.mock.calls.length - 1]).to.deep.equal(['value', raw])
    chai.expect(rawValue()).to.equal(raw)
  })

  it('preserves the raw value when the rejected proposal is textually identical to it (round-7)', () => {
    // Applying text identical to the current raw value: Backbone fires no
    // change:value, the facade never rebuilds, and stored reads back the
    // already-lossy serialization — a spurious "drop" report. Whatever the
    // outcome, the raw attribute must come through byte-identical.
    const raw = '${real_field} = 1 and ${typo_field} = 2'
    const lossy = (s: string) => s.replace(/ and \$\{typo_field\} = 2/, '')
    const { row, rawValue } = makeFacadeRow({ raw, serialize: lossy })
    applyExpressionToRow(row, 'relevant', raw)
    chai.expect(rawValue()).to.equal(raw)
  })

  it('does not consult getValue for non-facade attributes', () => {
    const { row, detail } = makeRow()
    detail.getValue = jest.fn(() => 'something else entirely')
    const outcome = applyExpressionToRow(row, 'calculation', '${A} + 1')
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
    chai.expect(detail.getValue.mock.calls.length).to.equal(0)
  })

  it('reports write-failed when the RowDetail write throws', () => {
    const { row } = makeRow({
      detail: {
        set: jest.fn(() => {
          throw new Error('boom')
        }),
      },
    })
    const outcome = applyExpressionToRow(row, 'default', 'today()')
    chai.expect(outcome).to.deep.equal({ status: 'error', reason: 'write-failed' })
  })

  it('rejects and reverts a ref-less wipeout — facade serializes a non-empty intent to empty (PR#273 deferred)', () => {
    const { row, detail, rawValue } = makeFacadeRow({ raw: "${OLD} = '1'", serialize: () => '' })
    const outcome = applyExpressionToRow(row, 'constraint', '. >= 0 and . <= 200')
    chai
      .expect(outcome)
      .to.deep.equal({ status: 'rejected', intended: '. >= 0 and . <= 200', stored: '', unresolved: [] })
    chai.expect(rawValue()).to.equal("${OLD} = '1'")
  })

  it('clearing to empty is not treated as a wipeout', () => {
    const { row } = makeFacadeRow({ raw: "${OLD} = '1'", serialize: (raw: string) => raw })
    const outcome = applyExpressionToRow(row, 'relevant', '')
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
  })
})

describe('focusPanelInput (P1.3 AC4)', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    document.body.innerHTML = ''
  })
  afterEach(() => {
    warnSpy.mockRestore()
    document.body.innerHTML = ''
  })

  it('focuses the calculation input', () => {
    document.body.innerHTML = '<textarea class="js-calculation-input"></textarea>'
    const focused = focusPanelInput('calculation')
    chai.expect(focused).to.equal(true)
    chai.expect(document.activeElement?.className).to.equal('js-calculation-input')
  })

  it("focuses the relevant panel's first interactive control inside .skiplogic__main", () => {
    document.body.innerHTML =
      '<div class="js-card-settings-relevant-logic"><div class="skiplogic__main"><select class="target"></select></div></div>'
    const focused = focusPanelInput('relevant')
    chai.expect(focused).to.equal(true)
    chai.expect(document.activeElement?.className).to.equal('target')
  })

  it('falls back to a mode-selector button when the panel has no input (round-5 #4)', () => {
    // On a fully-collapsed skip-logic panel the only focusable control in
    // .skiplogic__main is a mode-selector <button> — focus it rather than
    // finding nothing.
    document.body.innerHTML =
      '<div class="js-card-settings-relevant-logic"><div class="skiplogic__main"><button class="mode">+ Add a condition</button></div></div>'
    const focused = focusPanelInput('relevant')
    chai.expect(focused).to.equal(true)
    chai.expect(document.activeElement?.className).to.equal('mode')
  })

  it('scopes to the given root so a second open drawer is not hit (round-5 #2)', () => {
    // Two rows expanded at once render the same class; a document-wide lookup
    // would return whichever comes first in DOM order. Passing the row's own
    // settings root disambiguates by row.
    document.body.innerHTML =
      '<div id="rowA" class="card__settings"><div class="js-card-settings-relevant-logic"><div class="skiplogic__main"><input class="a"></div></div></div>' +
      '<div id="rowB" class="card__settings"><div class="js-card-settings-relevant-logic"><div class="skiplogic__main"><input class="b"></div></div></div>'
    const rowB = document.getElementById('rowB')!
    focusPanelInput('relevant', rowB)
    chai.expect(document.activeElement?.className).to.equal('b')
  })

  it('returns false for an unmapped attribute', () => {
    chai.expect(focusPanelInput('bogus')).to.equal(false)
  })

  it('returns false and warns when the input is not in the DOM', () => {
    chai.expect(focusPanelInput('calculation')).to.equal(false)
    chai.expect(warnSpy.mock.calls.length).to.equal(1)
  })
})

describe('focusGenerateButton (P1.1 AC6, dismiss)', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    document.body.innerHTML = ''
  })
  afterEach(() => {
    warnSpy.mockRestore()
    document.body.innerHTML = ''
  })

  it("focuses the panel's Generate button by its accessible name", () => {
    document.body.innerHTML = '<button aria-label="Generate Relevant Logic with AI">Generate</button>'
    const focused = focusGenerateButton('relevant')
    chai.expect(focused).to.equal(true)
    chai
      .expect((document.activeElement as HTMLElement)?.getAttribute('aria-label'))
      .to.equal('Generate Relevant Logic with AI')
  })

  it('scopes to the requested attribute when several Generate buttons are present', () => {
    document.body.innerHTML =
      '<button aria-label="Generate Calculation with AI">g1</button>' +
      '<button aria-label="Generate Constraint Logic with AI" id="target">g2</button>'
    focusGenerateButton('constraint')
    chai.expect((document.activeElement as HTMLElement)?.id).to.equal('target')
  })

  it('scopes to the given root so the right row is focused (round-5 #2)', () => {
    // Same attribute, two rows; the row's settings root disambiguates.
    document.body.innerHTML =
      '<div id="rowA" class="card__settings"><button aria-label="Generate Relevant Logic with AI" id="a">g</button></div>' +
      '<div id="rowB" class="card__settings"><button aria-label="Generate Relevant Logic with AI" id="b">g</button></div>'
    const rowB = document.getElementById('rowB')!
    focusGenerateButton('relevant', rowB)
    chai.expect((document.activeElement as HTMLElement)?.id).to.equal('b')
  })

  it('returns false for an unmapped attribute', () => {
    chai.expect(focusGenerateButton('bogus')).to.equal(false)
  })

  it('returns false and warns when no matching Generate button exists', () => {
    chai.expect(focusGenerateButton('relevant')).to.equal(false)
    chai.expect(warnSpy.mock.calls.length).to.equal(1)
  })
})

describe('readCurrentExpression (P1.3 AC2)', () => {
  it('returns the raw stored value for the attribute', () => {
    const detail = {
      set: jest.fn(),
      get: jest.fn((k: string) => (k === 'value' ? '${OLD} + 1' : undefined)),
      getValue: jest.fn(() => 'reformatted'),
    }
    const { row } = makeRow({ detail })
    chai.expect(readCurrentExpression(row, 'calculation')).to.equal('${OLD} + 1')
    chai.expect(detail.getValue.mock.calls.length).to.equal(0)
  })

  it('prefers RAW for facade attributes when non-empty — never the lossy getValue() serialization', () => {
    const { row, detail } = makeFacadeRow({
      raw: "${A} = '1' and ${GONE} = '2'",
      serialize: () => "${A} = '1'",
    })
    chai.expect(readCurrentExpression(row, 'relevant')).to.equal("${A} = '1' and ${GONE} = '2'")
    chai.expect(detail.getValue.mock.calls.length).to.equal(0)
  })

  it('returns empty string when the row has no RowDetail for the attribute', () => {
    const { row } = makeRow({ detail: undefined })
    chai.expect(readCurrentExpression(row, 'calculation')).to.equal('')
  })

  it('returns empty string for a null row and for a detail without get()', () => {
    chai.expect(readCurrentExpression(null, 'calculation')).to.equal('')
    const { row } = makeRow({ detail: { set: jest.fn(), getValue: jest.fn() } })
    chai.expect(readCurrentExpression(row, 'calculation')).to.equal('')
  })

  it('returns empty string when the stored value is null, and coerces non-strings', () => {
    const nullDetail = { set: jest.fn(), get: jest.fn(() => null), getValue: jest.fn() }
    chai.expect(readCurrentExpression(makeRow({ detail: nullDetail }).row, 'default')).to.equal('')
    const numDetail = { set: jest.fn(), get: jest.fn(() => 7), getValue: jest.fn() }
    chai.expect(readCurrentExpression(makeRow({ detail: numDetail }).row, 'repeat_count')).to.equal('7')
  })

  it('falls back to the facade serialization ONLY to detect panel-built content when raw is empty', () => {
    const { row, detail } = makeFacadeRow({ raw: '', serialize: () => "${A} = '1'" })
    chai.expect(readCurrentExpression(row, 'relevant')).to.equal("${A} = '1'")
    chai.expect(detail.getValue.mock.calls.length).to.equal(1)
  })

  it('does not consult the facade for non-facade attributes with empty raw', () => {
    const detail = { set: jest.fn(), get: jest.fn(() => ''), getValue: jest.fn(() => 'SHOULD NOT BE READ') }
    const { row } = makeRow({ detail })
    chai.expect(readCurrentExpression(row, 'calculation')).to.equal('')
    chai.expect(detail.getValue.mock.calls.length).to.equal(0)
  })

  it('normalizes the Required state sentinels to empty — pristine/toggled panels never confirm', () => {
    for (const sentinel of ['', 'false', 'true', false, true]) {
      const detail = { set: jest.fn(), get: jest.fn(() => sentinel), getValue: jest.fn() }
      chai.expect(readCurrentExpression(makeRow({ detail }).row, 'required')).to.equal('')
    }
  })

  it("keeps 'yes' (Always) and real expressions non-empty for required — those DO confirm", () => {
    const yes = { set: jest.fn(), get: jest.fn(() => 'yes'), getValue: jest.fn() }
    chai.expect(readCurrentExpression(makeRow({ detail: yes }).row, 'required')).to.equal('yes')
    const expr = { set: jest.fn(), get: jest.fn(() => '${AGE} > 18'), getValue: jest.fn() }
    chai.expect(readCurrentExpression(makeRow({ detail: expr }).row, 'required')).to.equal('${AGE} > 18')
  })
})

describe('P1.3 AC guards — pass-through fidelity, no provenance, round-trip', () => {
  it('AC3: writes the applied expression byte-identical for a non-stripping attribute', () => {
    // repeat_count is neither newline-stripping nor facade-backed, so the
    // string must land in RowDetail exactly as the dialog sent it.
    const { row, detail } = makeRow()
    const expr = 'concat(\'a\', "b")  + ${W}'
    const outcome = applyExpressionToRow(row, 'repeat_count', expr)
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
    chai.expect(detail.set.mock.calls).to.deep.equal([['value', expr]])
  })

  it('AC5: apply writes only the value key — no provenance mark on detail or row', () => {
    const detail = { set: jest.fn(), getValue: jest.fn() }
    const row = {
      get: jest.fn(() => detail),
      getSurvey: jest.fn(() => ({ trigger: jest.fn() })),
      set: jest.fn(),
    }
    applyExpressionToRow(row, 'default', '1 + 1')
    chai.expect(row.set.mock.calls.length).to.equal(0)
    chai.expect(detail.set.mock.calls.map((c: any[]) => c[0])).to.deep.equal(['value'])
  })

  it('AC6: an applied facade expression round-trips byte-for-byte through the raw read', () => {
    const { row, rawValue } = makeFacadeRow({ raw: '', serialize: (raw: string) => raw })
    const expr = '${HEIGHT} > 0 and ${WEIGHT} > 0'
    const outcome = applyExpressionToRow(row, 'constraint', expr)
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
    chai.expect(rawValue()).to.equal(expr)
    // The same raw value is what the confirmation reader reports next time.
    chai.expect(readCurrentExpression(row, 'constraint')).to.equal(expr)
  })
})
