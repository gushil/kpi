import chai from 'chai'

// Capture every React root the bridge creates so the unmount semantics are
// directly assertable. (Variables referenced from a jest.mock factory must be
// prefixed with `mock`.)
const mockRoots: Array<{ render: jest.Mock; unmount: jest.Mock }> = []
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => {
    const root = { render: jest.fn(), unmount: jest.fn() }
    mockRoots.push(root)
    return root
  }),
}))
jest.mock('#/stores', () => ({ stores: { surveyState: { setState: jest.fn() } } }))

import { mountGenerateButton, unmountAll } from './generateButtonBridge'

describe('generateButtonBridge (P1.1)', () => {
  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    document.body.innerHTML = ''
  })
  afterEach(() => {
    unmountAll() // reset the module-level tracked-roots registry between tests
    mockRoots.length = 0
    warnSpy.mockRestore()
    errorSpy.mockRestore()
    document.body.innerHTML = ''
  })

  it('mounts a Generate button root under the anchor', () => {
    const anchor = document.createElement('div')
    document.body.appendChild(anchor)
    const mountEl = mountGenerateButton(anchor, { row: {}, attribute: 'calculation' })
    chai.expect(mountEl).to.not.equal(null)
    chai.expect(mountEl?.parentElement).to.equal(anchor)
    chai.expect(mockRoots.length).to.equal(1)
    chai.expect(mockRoots[0].render.mock.calls.length).to.equal(1)
  })

  it('warns and mounts nothing when the anchor cannot be resolved', () => {
    const mountEl = mountGenerateButton(null, { row: {}, attribute: 'calculation' })
    chai.expect(mountEl).to.equal(null)
    chai.expect(mockRoots.length).to.equal(0)
    chai.expect(warnSpy.mock.calls.length).to.equal(1)
  })

  it('warns and mounts nothing for an attribute with no tab mapping', () => {
    const anchor = document.createElement('div')
    document.body.appendChild(anchor)
    const mountEl = mountGenerateButton(anchor, { row: {}, attribute: 'label' })
    chai.expect(mountEl).to.equal(null)
    chai.expect(anchor.children.length).to.equal(0)
    chai.expect(warnSpy.mock.calls.length).to.equal(1)
  })

  it('unmountAll(scope) unmounts only the roots inside that scope', () => {
    const anchorA = document.createElement('div')
    const anchorB = document.createElement('div')
    document.body.append(anchorA, anchorB)
    mountGenerateButton(anchorA, { row: {}, attribute: 'calculation' })
    mountGenerateButton(anchorB, { row: {}, attribute: 'relevant' })
    unmountAll(anchorA)
    chai.expect(mockRoots[0].unmount.mock.calls.length).to.equal(1)
    chai.expect(mockRoots[1].unmount.mock.calls.length).to.equal(0)
    chai.expect(anchorA.children.length).to.equal(0)
    chai.expect(anchorB.children.length).to.equal(1)
  })

  it('unmountAll() with no scope unmounts every tracked root', () => {
    const anchorA = document.createElement('div')
    const anchorB = document.createElement('div')
    document.body.append(anchorA, anchorB)
    mountGenerateButton(anchorA, { row: {}, attribute: 'calculation' })
    mountGenerateButton(anchorB, { row: {}, attribute: 'relevant' })
    unmountAll()
    chai.expect(mockRoots[0].unmount.mock.calls.length).to.equal(1)
    chai.expect(mockRoots[1].unmount.mock.calls.length).to.equal(1)
  })

  it('unmountAll(unresolvable scope) logs an error and unmounts NOTHING (never escalates to unmount-everything)', () => {
    const anchor = document.createElement('div')
    document.body.appendChild(anchor)
    mountGenerateButton(anchor, { row: {}, attribute: 'calculation' })
    unmountAll({} as unknown) // a scope was requested but cannot be resolved
    chai.expect(mockRoots[0].unmount.mock.calls.length).to.equal(0)
    chai.expect(anchor.children.length).to.equal(1)
    chai.expect(errorSpy.mock.calls.length).to.equal(1)
  })
})
