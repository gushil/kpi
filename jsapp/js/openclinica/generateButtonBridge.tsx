/**
 * OC fork — P1.3 Logic Builder "Generate" button bridge (Backbone <-> React).
 *
 * The xlform Form Designer settings drawer is hand-built jQuery/CoffeeScript.
 * This module lets that CoffeeScript imperatively mount the package's
 * `<GenerateButton>` into a given anchor element and, crucially, tear the React
 * root back down when the drawer is cleaned up (`_cleanupExpandedRender`), so
 * we never leak roots on drawer toggle.
 *
 * Clicking the button pushes a `generateRequest` onto the `stores.surveyState`
 * Reflux store; `EditableForm.tsx` reads that to open the shared
 * `<AiGeneratorDialog>`. See `logicBuilderTabs.ts` for the store key + mapping.
 */
import React from 'react'

import { GenerateButton } from '@openclinica/logic-builder'
import { createRoot, type Root } from 'react-dom/client'
import { stores } from '#/stores'
import { GENERATE_REQUEST_KEY, columnToTab } from './logicBuilderTabs'

import '@openclinica/logic-builder/style.css'

const MOUNT_CLASS = 'logic-builder-generate-mount'

interface TrackedRoot {
  mountEl: HTMLElement
  root: Root
}

// Module-level registry of every React root we create, so we can unmount them
// on drawer cleanup (the settings drawer has no unmount hook of its own).
const trackedRoots: TrackedRoot[] = []

interface MountOptions {
  // Backbone Row model (xlform).
  row: any
  // xlform RowDetail column name, e.g. 'calculation' | 'relevant' | 'repeat_count'.
  attribute: string
}

/** Accept a raw DOM element or a jQuery-like wrapper and return the DOM node. */
function resolveEl(anchor: unknown): HTMLElement | null {
  if (!anchor) {
    return null
  }
  if (anchor instanceof HTMLElement) {
    return anchor
  }
  const jq = anchor as { get?: (i: number) => HTMLElement; 0?: HTMLElement; length?: number }
  if (typeof jq.get === 'function') {
    return jq.get(0) || null
  }
  if (jq[0] instanceof HTMLElement) {
    return jq[0]
  }
  return null
}

/**
 * Mount a `<GenerateButton>` as a child of `anchor` for the given row+attribute.
 * No-op for unmappable columns or a missing anchor. Returns the mount element.
 */
export function mountGenerateButton(anchor: unknown, options: MountOptions): HTMLElement | null {
  const anchorEl = resolveEl(anchor)
  if (!anchorEl) {
    return null
  }

  const tab = columnToTab(options.attribute)
  if (!tab) {
    return null
  }

  const mountEl = document.createElement('span')
  mountEl.className = MOUNT_CLASS
  // Separate the button from the panel header title it sits beside, and keep
  // it vertically centered against the header text.
  mountEl.style.marginLeft = '12px'
  mountEl.style.verticalAlign = 'middle'
  anchorEl.appendChild(mountEl)

  const root = createRoot(mountEl)
  root.render(
    <GenerateButton
      attribute={tab}
      onOpen={() => {
        stores.surveyState.setState({
          [GENERATE_REQUEST_KEY]: { row: options.row, attribute: options.attribute },
        })
      }}
    />,
  )

  trackedRoots.push({ mountEl, root })
  return mountEl
}

/**
 * Unmount every tracked root whose mount element lives inside `scope` (or all of
 * them when `scope` is omitted). Called from the settings-drawer cleanup so React
 * roots don't leak when the drawer is torn down.
 */
export function unmountAll(scope?: unknown): void {
  const scopeEl = resolveEl(scope)
  for (let i = trackedRoots.length - 1; i >= 0; i -= 1) {
    const tracked = trackedRoots[i]
    const inScope = !scopeEl || scopeEl === tracked.mountEl || scopeEl.contains(tracked.mountEl)
    if (!inScope) {
      continue
    }
    try {
      tracked.root.unmount()
    } catch {
      // ignore — already unmounted / detached
    }
    tracked.mountEl.remove()
    trackedRoots.splice(i, 1)
  }
}
