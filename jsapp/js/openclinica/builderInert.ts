/**
 * OC fork — P1.1 AC2 "scrollable but inert" (design §5.4).
 *
 * While the AI Generator dialog is open, the form builder must stay viewable
 * and SCROLLABLE but not editable. `inert` implies pointer-events:none for hit
 * testing, so inerting any ancestor of the scroll container
 * (`.form-builder__contents`, overflow-y: scroll) makes wheel events skip it —
 * the form stops scrolling (the original implementation inerted the whole
 * `.form-builder-wrapper` and broke exactly this).
 *
 * The boundary that satisfies both halves of AC2: inert everything AROUND and
 * INSIDE the scroller — the aside, the header, and the dedicated inner wrapper
 * holding the scroller's children — but never the scroller itself. A wheel
 * event over the inert content falls through hit-testing to the (non-inert)
 * scroller and scrolls it; the scrollbar stays draggable; nothing inside is
 * clickable or focusable.
 */

interface AttrSnapshot {
  el: HTMLElement
  hadInert: boolean
  prevAriaHidden: string | null
}

/**
 * Make the builder's interactive regions inert (+ aria-hidden), leaving the
 * scroll container alone. Returns a restore function that reinstates each
 * element's prior attribute state; both directions tolerate nulls.
 */
export function makeBuilderInert(wrapper: HTMLElement | null, contentsInner: HTMLElement | null): () => void {
  const targets: (HTMLElement | null)[] = [
    wrapper?.querySelector<HTMLElement>('.form-builder-aside') ?? null,
    wrapper?.querySelector<HTMLElement>('.form-builder-header') ?? null,
    contentsInner,
  ]
  const snapshots: AttrSnapshot[] = []
  for (const el of targets) {
    if (!el) {
      continue
    }
    snapshots.push({
      el,
      hadInert: el.hasAttribute('inert'),
      prevAriaHidden: el.getAttribute('aria-hidden'),
    })
    el.setAttribute('inert', '')
    el.setAttribute('aria-hidden', 'true')
  }
  return () => {
    for (const { el, hadInert, prevAriaHidden } of snapshots) {
      if (!hadInert) {
        el.removeAttribute('inert')
      }
      if (prevAriaHidden === null) {
        el.removeAttribute('aria-hidden')
      } else {
        el.setAttribute('aria-hidden', prevAriaHidden)
      }
    }
  }
}
