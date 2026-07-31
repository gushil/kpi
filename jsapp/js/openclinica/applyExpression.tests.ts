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

describe('applyExpressionToRow (P1.3)', () => {
  let errorSpy: jest.SpyInstance
  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    errorSpy.mockRestore()
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
    chai.expect(outcome).to.deep.equal({ status: 'applied', storedMismatch: null })
    chai.expect(detail.set.mock.calls).to.deep.equal([['value', '${A} + ${B}']])
    chai.expect(survey.trigger.mock.calls).to.deep.equal([['change']])
  })

  it('keeps newlines for relevant (manual entry keeps them there too)', () => {
    const { row, detail } = makeRow()
    detail.getValue = jest.fn(() => '${A} = 1\nand ${B} = 2')
    applyExpressionToRow(row, 'relevant', '${A} = 1\nand ${B} = 2')
    chai.expect(detail.set.mock.calls[0][1]).to.equal('${A} = 1\nand ${B} = 2')
  })

  it('does not report a mismatch when the facade only reformats (whitespace / quote style)', () => {
    const { row, detail } = makeRow()
    detail.getValue = jest.fn(() => "${A}=1 and ${B}='x'")
    const outcome = applyExpressionToRow(row, 'relevant', '${A} = 1 and ${B} = "x"')
    chai.expect(outcome).to.deep.equal({ status: 'applied', storedMismatch: null })
  })

  it('reports a mismatch when the facade drops a clause it cannot resolve', () => {
    const { row, detail } = makeRow()
    detail.getValue = jest.fn(() => '${A} = 1')
    const outcome = applyExpressionToRow(row, 'constraint', '${A} = 1 and ${NOPE} = 2')
    chai.expect(outcome).to.deep.equal({
      status: 'applied',
      storedMismatch: { intended: '${A} = 1 and ${NOPE} = 2', stored: '${A} = 1' },
    })
  })

  it('reports a mismatch when the facade serializes the whole expression away', () => {
    const { row, detail } = makeRow()
    detail.getValue = jest.fn(() => '')
    const outcome = applyExpressionToRow(row, 'relevant', '${AGE} >= 18')
    chai.expect(outcome.status).to.equal('applied')
    chai.expect((outcome as any).storedMismatch).to.deep.equal({ intended: '${AGE} >= 18', stored: '' })
  })

  it('does not consult getValue for non-facade attributes', () => {
    const { row, detail } = makeRow()
    detail.getValue = jest.fn(() => 'something else entirely')
    const outcome = applyExpressionToRow(row, 'calculation', '${A} + 1')
    chai.expect(outcome).to.deep.equal({ status: 'applied', storedMismatch: null })
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
    // The GenerateButton renders aria-label `Generate <Label> with AI`.
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

  it('returns false for an unmapped attribute', () => {
    chai.expect(focusGenerateButton('bogus')).to.equal(false)
  })

  it('returns false and warns when no matching Generate button exists', () => {
    chai.expect(focusGenerateButton('relevant')).to.equal(false)
    chai.expect(warnSpy.mock.calls.length).to.equal(1)
  })
})
