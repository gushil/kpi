import chai from 'chai'
import { makeBuilderInert } from './builderInert'

// Build the Form Designer's relevant DOM shape: the wrapper holds the aside,
// the header, and the scroll container (.form-builder__contents), whose
// children live inside the dedicated inner wrapper the host inerts. The
// SCROLLER itself must never be inerted — inert implies pointer-events:none
// for hit testing, so an inert scroller can't receive wheel events and the
// form stops scrolling (AC2: viewable and scrollable, but not editable).
function buildDom(opts: { aside?: boolean } = {}) {
  document.body.innerHTML = ''
  const wrapper = document.createElement('div')
  wrapper.className = 'form-builder-wrapper'
  if (opts.aside !== false) {
    const aside = document.createElement('aside')
    aside.className = 'form-builder-aside'
    wrapper.appendChild(aside)
  }
  const header = document.createElement('div')
  header.className = 'form-builder-header'
  const contents = document.createElement('div')
  contents.className = 'form-builder__contents'
  const inner = document.createElement('div')
  inner.className = 'form-builder__contents-inner'
  contents.appendChild(inner)
  wrapper.appendChild(header)
  wrapper.appendChild(contents)
  document.body.appendChild(wrapper)
  return {
    wrapper,
    header,
    contents,
    inner,
    aside: wrapper.querySelector<HTMLElement>('.form-builder-aside'),
  }
}

describe('makeBuilderInert (P1.1 AC2 — scrollable but inert)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('inerts the aside, header, and contents-inner — but never the scroller', () => {
    const { wrapper, header, contents, inner, aside } = buildDom()
    makeBuilderInert(wrapper, inner)
    chai.expect(aside?.hasAttribute('inert')).to.equal(true)
    chai.expect(aside?.getAttribute('aria-hidden')).to.equal('true')
    chai.expect(header.hasAttribute('inert')).to.equal(true)
    chai.expect(inner.hasAttribute('inert')).to.equal(true)
    // The scroll container must stay hit-testable so wheel events falling
    // through its inert child still reach it and scrolling keeps working.
    chai.expect(contents.hasAttribute('inert')).to.equal(false)
    chai.expect(contents.hasAttribute('aria-hidden')).to.equal(false)
    // The wrapper itself must not be inert either (it contains the scroller).
    chai.expect(wrapper.hasAttribute('inert')).to.equal(false)
  })

  it('restore removes the attributes it added', () => {
    const { wrapper, header, inner, aside } = buildDom()
    const restore = makeBuilderInert(wrapper, inner)
    restore()
    for (const el of [aside, header, inner]) {
      chai.expect(el?.hasAttribute('inert')).to.equal(false)
      chai.expect(el?.hasAttribute('aria-hidden')).to.equal(false)
    }
  })

  it('does not remove a pre-existing inert attribute on restore (review PR#286)', () => {
    // If something else already inerted a region (e.g. another overlay), our
    // restore must put back the state we found, not clear it.
    const { wrapper, inner, aside } = buildDom()
    aside?.setAttribute('inert', '')
    const restore = makeBuilderInert(wrapper, inner)
    restore()
    chai.expect(aside?.hasAttribute('inert')).to.equal(true)
  })

  it('preserves a pre-existing aria-hidden value across apply/restore', () => {
    const { wrapper, inner, aside } = buildDom()
    aside?.setAttribute('aria-hidden', 'false')
    const restore = makeBuilderInert(wrapper, inner)
    chai.expect(aside?.getAttribute('aria-hidden')).to.equal('true')
    restore()
    chai.expect(aside?.getAttribute('aria-hidden')).to.equal('false')
  })

  it('tolerates a missing aside (not rendered) and still inerts the rest', () => {
    const { wrapper, header, inner } = buildDom({ aside: false })
    makeBuilderInert(wrapper, inner)
    chai.expect(header.hasAttribute('inert')).to.equal(true)
    chai.expect(inner.hasAttribute('inert')).to.equal(true)
  })

  it('tolerates a missing header (not rendered) and still inerts the rest (review PR#286)', () => {
    const { wrapper, inner, aside } = buildDom()
    wrapper.querySelector('.form-builder-header')?.remove()
    makeBuilderInert(wrapper, inner)
    chai.expect(aside?.hasAttribute('inert')).to.equal(true)
    chai.expect(inner.hasAttribute('inert')).to.equal(true)
  })

  it('is a safe no-op for null inputs', () => {
    const restore = makeBuilderInert(null, null)
    chai.expect(() => restore()).not.to.throw()
  })
})
