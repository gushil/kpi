import { render, screen } from '@testing-library/react'
import chai from 'chai'
import React from 'react'
import { LogicBuilderErrorBoundary } from './LogicBuilderErrorBoundary'

function Bomb(): JSX.Element {
  throw new Error('dialog crashed')
}

describe('LogicBuilderErrorBoundary (P1.4 AC7)', () => {
  let consoleError: jest.SpyInstance
  beforeEach(() => {
    // React logs the caught error; keep test output clean and assert the call.
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => consoleError.mockRestore())

  it('renders its child when nothing throws', () => {
    render(
      <LogicBuilderErrorBoundary onCrash={jest.fn()}>
        <div data-testid='dialog' />
      </LogicBuilderErrorBoundary>,
    )
    chai.expect(screen.getByTestId('dialog')).to.not.equal(null)
  })

  it('degrades to nothing and reports the crash once', () => {
    const onCrash = jest.fn()
    const { container } = render(
      <LogicBuilderErrorBoundary onCrash={onCrash}>
        <Bomb />
      </LogicBuilderErrorBoundary>,
    )
    chai.expect(container.innerHTML).to.equal('')
    chai.expect(onCrash.mock.calls.length).to.equal(1)
    chai.expect(consoleError.mock.calls.some((args) => String(args[0]).includes('AI Generator crashed'))).to.equal(true)
  })

  it('does not let the crash propagate to the host tree', () => {
    chai
      .expect(() =>
        render(
          <LogicBuilderErrorBoundary onCrash={jest.fn()}>
            <Bomb />
          </LogicBuilderErrorBoundary>,
        ),
      )
      .to.not.throw()
  })
})
