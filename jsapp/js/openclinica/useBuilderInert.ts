/**
 * OC fork — P1.1 AC2 "scrollable but inert": React wiring for makeBuilderInert.
 *
 * While `active` (the AI Generator dialog is open), applies the builder-inert
 * boundary — aside, header, and the contents-inner wrapper, never the scroll
 * container — and restores each element's prior attribute state when the
 * dialog closes or the builder unmounts. Extracted from EditableForm so the
 * effect's dependency/cleanup behavior is unit-testable via renderHook
 * (review PR#286).
 */
import { type RefObject, useEffect } from 'react'
import { makeBuilderInert } from './builderInert'

export function useBuilderInert(
  active: boolean,
  wrapperRef: RefObject<HTMLElement | null>,
  contentsInnerRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!active) {
      return
    }
    return makeBuilderInert(wrapperRef.current, contentsInnerRef.current)
  }, [active, wrapperRef, contentsInnerRef])
}
