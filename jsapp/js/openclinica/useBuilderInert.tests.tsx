import { renderHook } from '@testing-library/react'
import chai from 'chai'
import { type RefObject, createRef } from 'react'
import { useBuilderInert } from './useBuilderInert'

// Effect-wiring coverage for the builder-inert behavior (review PR#286): the
// pure attribute logic is covered by builderInert.tests.ts; these tests drive
// the REACT side — apply on becoming active, restore on deactivate and on
// unmount, and correct behavior across toggles — through real hook renders.
function buildDom() {
  document.body.innerHTML = ''
  const wrapper = document.createElement('div')
  wrapper.className = 'form-builder-wrapper'
  const aside = document.createElement('aside')
  aside.className = 'form-builder-aside'
  const header = document.createElement('div')
  header.className = 'form-builder-header'
  const contents = document.createElement('div')
  contents.className = 'form-builder__contents'
  const inner = document.createElement('div')
  inner.className = 'form-builder__contents-inner'
  contents.appendChild(inner)
  wrapper.append(aside, header, contents)
  document.body.appendChild(wrapper)
  const wrapperRef = { current: wrapper } as RefObject<HTMLDivElement>
  const innerRef = { current: inner } as RefObject<HTMLDivElement>
  return { wrapper, aside, header, contents, inner, wrapperRef, innerRef }
}

describe('useBuilderInert (P1.1 AC2 — effect wiring)', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('applies inert when active becomes true and restores when it becomes false', () => {
    const { header, inner, contents, wrapperRef, innerRef } = buildDom()
    const { rerender } = renderHook(({ active }) => useBuilderInert(active, wrapperRef, innerRef), {
      initialProps: { active: false },
    })
    chai.expect(header.hasAttribute('inert')).to.equal(false)
    rerender({ active: true })
    chai.expect(header.hasAttribute('inert')).to.equal(true)
    chai.expect(inner.hasAttribute('inert')).to.equal(true)
    chai.expect(contents.hasAttribute('inert')).to.equal(false) // never the scroller
    rerender({ active: false })
    chai.expect(header.hasAttribute('inert')).to.equal(false)
    chai.expect(inner.hasAttribute('inert')).to.equal(false)
  })

  it('restores on unmount while active (dialog open when the builder unmounts)', () => {
    const { header, inner, wrapperRef, innerRef } = buildDom()
    const { unmount } = renderHook(() => useBuilderInert(true, wrapperRef, innerRef))
    chai.expect(header.hasAttribute('inert')).to.equal(true)
    unmount()
    chai.expect(header.hasAttribute('inert')).to.equal(false)
    chai.expect(inner.hasAttribute('inert')).to.equal(false)
  })

  it('re-applies cleanly across open → close → open toggles', () => {
    const { header, wrapperRef, innerRef } = buildDom()
    const { rerender } = renderHook(({ active }) => useBuilderInert(active, wrapperRef, innerRef), {
      initialProps: { active: true },
    })
    rerender({ active: false })
    rerender({ active: true })
    chai.expect(header.hasAttribute('inert')).to.equal(true)
    rerender({ active: false })
    chai.expect(header.hasAttribute('inert')).to.equal(false)
  })

  it('is a safe no-op when the refs are empty', () => {
    const wrapperRef = createRef<HTMLDivElement>()
    const innerRef = createRef<HTMLDivElement>()
    const { rerender, unmount } = renderHook(({ active }) => useBuilderInert(active, wrapperRef, innerRef), {
      initialProps: { active: true },
    })
    rerender({ active: false })
    unmount()
  })
})
