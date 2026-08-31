/**
 * OC fork — P1.4 AC7: if the AI Generator crashes at render/runtime, degrade
 * to "no dialog" instead of unwinding the Form Designer tree. The logic
 * panel's plain expression field is host-owned DOM outside this boundary, so
 * it stays viewable, editable, and saveable. `onCrash` lets the host clear the
 * open-dialog state (closeGenerateDialog), which also lifts the builder inert
 * marking and restores focus.
 */
import React from 'react'

interface Props {
  children: React.ReactNode
  onCrash: () => void
}

interface State {
  crashed: boolean
}

export class LogicBuilderErrorBoundary extends React.Component<Props, State> {
  state: State = { crashed: false }

  static getDerivedStateFromError(): State {
    return { crashed: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Logic Builder: AI Generator crashed; degrading to the plain expression field', error, info)
    this.props.onCrash()
  }

  render() {
    return this.state.crashed ? null : this.props.children
  }
}
