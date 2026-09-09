import chai from 'chai'

const mockCheckSyntax = jest.fn()
jest.mock('./checkSyntax', () => ({
  __esModule: true,
  checkSyntax: (...args: unknown[]) => mockCheckSyntax(...args),
}))
jest.mock('./logicBuilderContext', () => ({
  __esModule: true,
  buildFormContext: jest.fn(() => ({ rows: [] })),
}))

import { buildFormContext } from './logicBuilderContext'
import { findSyntaxCheckAnchor, runSyntaxCheck } from './syntaxCheckBridge'

const mockBuildFormContext = buildFormContext as jest.Mock

function makeRow(value: string) {
  return {
    get: (attribute: string) =>
      attribute === 'calculation' ? { get: (k: string) => (k === 'value' ? value : undefined) } : undefined,
  }
}

function makeFacadeRow(rawSeed: string, liveValue: string) {
  return {
    get: (attribute: string) =>
      attribute === 'relevant'
        ? { get: (k: string) => (k === 'value' ? rawSeed : undefined), getValue: () => liveValue }
        : undefined,
  }
}

describe('runSyntaxCheck (P1.11 AC1, AC3)', () => {
  beforeEach(() => {
    mockCheckSyntax.mockReset()
    mockBuildFormContext.mockClear()
    document.body.innerHTML = ''
  })

  it('renders one message beneath the anchor for one detected error', () => {
    mockCheckSyntax.mockReturnValue(['Missing closing parenthesis'])
    const anchor = document.createElement('textarea')
    document.body.appendChild(anchor)

    runSyntaxCheck(makeRow('${A} div (B'), 'calculation', anchor)

    const messages = document.body.querySelectorAll('.js-syntax-check-message')
    chai.expect(messages.length).to.equal(1)
    chai.expect(messages[0].textContent).to.equal('Missing closing parenthesis')
  })

  it('renders every message in order when several errors are detected (AC3)', () => {
    mockCheckSyntax.mockReturnValue(['first error', 'second error'])
    const anchor = document.createElement('textarea')
    document.body.appendChild(anchor)

    runSyntaxCheck(makeRow('bad'), 'calculation', anchor)

    const messages = [...document.body.querySelectorAll('.js-syntax-check-message')].map((el) => el.textContent)
    chai.expect(messages).to.deep.equal(['first error', 'second error'])
  })

  it('replaces the previous verdict on a re-check rather than appending to it', () => {
    const anchor = document.createElement('textarea')
    document.body.appendChild(anchor)

    mockCheckSyntax.mockReturnValue(['stale error'])
    runSyntaxCheck(makeRow('bad'), 'calculation', anchor)

    mockCheckSyntax.mockReturnValue(['fresh error'])
    runSyntaxCheck(makeRow('bad'), 'calculation', anchor)

    const messages = [...document.body.querySelectorAll('.js-syntax-check-message')].map((el) => el.textContent)
    chai.expect(messages).to.deep.equal(['fresh error'])
  })

  it('removes the message block entirely once the expression becomes clean', () => {
    const anchor = document.createElement('textarea')
    document.body.appendChild(anchor)

    mockCheckSyntax.mockReturnValue(['an error'])
    runSyntaxCheck(makeRow('bad'), 'calculation', anchor)

    mockCheckSyntax.mockReturnValue([])
    runSyntaxCheck(makeRow('fixed'), 'calculation', anchor)

    chai.expect(document.body.querySelectorAll('.js-syntax-check-message').length).to.equal(0)
  })

  it('does not throw and renders nothing when the anchor is null (panel not rendered)', () => {
    mockCheckSyntax.mockReturnValue(['an error'])
    chai.expect(() => runSyntaxCheck(makeRow('bad'), 'calculation', null)).to.not.throw()
    chai.expect(document.body.querySelectorAll('.js-syntax-check-message').length).to.equal(0)
  })

  it('skips the whole-form context build for an empty expression', () => {
    const anchor = document.createElement('textarea')
    document.body.appendChild(anchor)

    runSyntaxCheck(makeRow(''), 'calculation', anchor)

    chai.expect(mockBuildFormContext.mock.calls.length).to.equal(0)
    chai.expect(mockCheckSyntax.mock.calls.length).to.equal(0)
    chai.expect(document.body.querySelectorAll('.js-syntax-check-message').length).to.equal(0)
  })

  it('clears a stale message when the expression is edited back to empty', () => {
    const anchor = document.createElement('textarea')
    document.body.appendChild(anchor)

    mockCheckSyntax.mockReturnValue(['an error'])
    runSyntaxCheck(makeRow('bad'), 'calculation', anchor)

    runSyntaxCheck(makeRow(''), 'calculation', anchor)

    chai.expect(document.body.querySelectorAll('.js-syntax-check-message').length).to.equal(0)
  })

  it('checks the live facade value for Relevant/Constraint, not the stale raw seed', () => {
    // Hand-code typing never writes the raw stored value back (only Apply
    // does) — checking raw here would validate what the user typed BEFORE
    // this edit, not what's actually in the field now.
    mockCheckSyntax.mockReturnValue([])
    const row = makeFacadeRow('${a} = 1', '${a} = (1')
    const anchor = document.createElement('div')
    document.body.appendChild(anchor)

    runSyntaxCheck(row, 'relevant', anchor)

    chai.expect(mockCheckSyntax.mock.calls[0][0]).to.equal('${a} = (1')
  })
})

describe('findSyntaxCheckAnchor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('finds the plain textarea/input for a non-facade attribute', () => {
    document.body.innerHTML = '<textarea class="js-calculation-input"></textarea>'
    const anchor = findSyntaxCheckAnchor('calculation')
    chai.expect(anchor?.tagName).to.equal('TEXTAREA')
  })

  it("anchors relevant/constraint at the facade's .skiplogic__main container, not a row control", () => {
    document.body.innerHTML =
      '<div class="js-card-settings-relevant-logic"><div class="skiplogic__main"><select></select></div></div>'
    const anchor = findSyntaxCheckAnchor('relevant')
    chai.expect(anchor?.className).to.equal('skiplogic__main')
  })

  it('returns null for an unmapped attribute', () => {
    chai.expect(findSyntaxCheckAnchor('bogus')).to.equal(null)
  })
})
