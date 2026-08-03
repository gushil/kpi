import chai from 'chai'
import { applyExpressionToRow, focusPanelInput, focusGenerateButton } from './applyExpression'

// Minimal Backbone-ish fakes: a row hands out a RowDetail via get(attribute)
// and its survey via getSurvey(); the detail exposes set()/getValue().
function makeRow(options: { detail?: any; survey?: any } = {}) {
  const detail =
    'detail' in options
      ? options.detail
      : { set: jest.fn(), getValue: jest.fn() }
  const survey = 'survey' in options ? options.survey : { trigger: jest.fn() }
  const row = {
    get: jest.fn(() => detail),
    getSurvey: jest.fn(() => survey),
  }
  return { row, detail, survey }
}

// A facade-backed RowDetail whose getValue() returns a scripted sequence: the
// pre-write serialization first (captured to restore on a lossy apply), then
// the post-write serialization the drop-detection compares against.
function makeFacadeRow(getValues: string[]) {
  const getValue = jest.fn()
  for (const v of getValues) getValue.mockReturnValueOnce(v)
  getValue.mockReturnValue(getValues[getValues.length - 1] ?? '')
  const detail = { set: jest.fn(), getValue }
  return makeRow({ detail })
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
    chai.expect(detail.set.mock.calls).to.deep.equal([['value', '${A} + ${B}']])
    chai.expect(survey.trigger.mock.calls).to.deep.equal([['change']])
  })

  it('strips newlines for required too — its panel input is single-line (round-5 #7)', () => {
    const { row, detail } = makeRow()
    applyExpressionToRow(row, 'required', '${A} = 1\nand ${B} = 2')
    chai.expect(detail.set.mock.calls[0][1]).to.equal('${A} = 1and ${B} = 2')
  })

  it('keeps newlines for relevant (manual entry keeps them there too)', () => {
    // Stored form keeps both field refs → a clean apply, newlines preserved.
    const { row, detail } = makeFacadeRow(['', '${A} = 1\nand ${B} = 2'])
    const outcome = applyExpressionToRow(row, 'relevant', '${A} = 1\nand ${B} = 2')
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
    chai.expect(detail.set.mock.calls[0][1]).to.equal('${A} = 1\nand ${B} = 2')
  })

  it('does not flag a date() wrapper the serializer adds (round-5 #3 false positive)', () => {
    // DateOperator wraps a bare date literal in date('…') on serialize; the
    // field ref ${visit_date} survives, so this is a clean apply, not a drop.
    const { row } = makeFacadeRow(['', "${visit_date} > date('2024-01-01')"])
    const outcome = applyExpressionToRow(row, 'constraint', "${visit_date} > '2024-01-01'")
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
  })

  it('does not flag quotes the serializer adds around an unquoted value (round-5 #3)', () => {
    // TextOperator wraps an unquoted value in quotes; ${subject_code} survives.
    const { row } = makeFacadeRow(['', "${subject_code} = '123'"])
    const outcome = applyExpressionToRow(row, 'constraint', '${subject_code} = 123')
    chai.expect(outcome).to.deep.equal({ status: 'applied' })
  })

  it('refuses and reverts a partial clause-drop, reporting the unresolved refs (round-5 #5)', () => {
    // The facade dropped the ${NOPE} clause it could not resolve. Rather than
    // persist a silently-reduced expression, restore the previous value and
    // report a rejection.
    const previous = '${A} = 1'
    const { row, detail } = makeFacadeRow([previous, '${A} = 1'])
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
    const { row, detail } = makeFacadeRow(['', ''])
    const outcome = applyExpressionToRow(row, 'relevant', '${AGE} >= 18')
    chai.expect(outcome.status).to.equal('rejected')
    chai.expect((outcome as any).unresolved).to.deep.equal(['${AGE}'])
    chai.expect(detail.set.mock.calls).to.deep.equal([
      ['value', '${AGE} >= 18'],
      ['value', ''],
    ])
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
    document.body.innerHTML =
      '<button aria-label="Generate Relevant Logic with AI">Generate</button>'
    const focused = focusGenerateButton('relevant')
    chai.expect(focused).to.equal(true)
    chai.expect((document.activeElement as HTMLElement)?.getAttribute('aria-label')).to.equal(
      'Generate Relevant Logic with AI',
    )
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
