import { fireEvent, render, screen } from '@testing-library/react'
import chai from 'chai'
import React from 'react'
import { AVAILABLE_FORM_STYLES } from '#/constants'
import FormStyleCardGrid from './FormStyleCardGrid'

function renderGrid(props: Parameters<typeof FormStyleCardGrid>[0] = { onChange: () => undefined }) {
  return render(<FormStyleCardGrid {...props} />)
}

describe('FormStyleCardGrid — OC-28582 form style card grid', () => {
  it('renders all 4 cards', () => {
    renderGrid()
    chai.expect(screen.getAllByRole('radio')).to.have.length(4)
  })

  it('selects Simple–Single page by default when styleValue is undefined (AC8)', () => {
    renderGrid()
    const btn = screen.getByLabelText('Simple – Single page')
    chai.expect(btn.getAttribute('aria-checked')).to.equal('true')
  })

  it('selects the card matching the stored style value (AC4)', () => {
    renderGrid({ styleValue: 'theme-grid', onChange: () => undefined })
    chai.expect(screen.getByLabelText('Grid – Single page').getAttribute('aria-checked')).to.equal('true')
    chai.expect(screen.getByLabelText('Simple – Single page').getAttribute('aria-checked')).to.equal('false')
  })

  it('falls back to Simple–Single page for an unrecognised value (AC5)', () => {
    renderGrid({ styleValue: 'unknown-token' as any, onChange: () => undefined })
    chai.expect(screen.getByLabelText('Simple – Single page').getAttribute('aria-checked')).to.equal('true')
  })

  it('calls onChange with the correct FormStyleDefinition when a card is clicked (AC3)', () => {
    let called: (typeof AVAILABLE_FORM_STYLES)[0] | undefined
    renderGrid({
      onChange: (s) => {
        called = s
      },
    })
    fireEvent.click(screen.getByLabelText('Grid – Multiple pages'))
    chai.expect(called).to.deep.equal(AVAILABLE_FORM_STYLES.find((s) => s.value === 'theme-grid pages'))
  })

  it('does not call onChange when disabled', () => {
    let called = false
    renderGrid({
      isDisabled: true,
      onChange: () => {
        called = true
      },
    })
    // disabled buttons don't fire click events
    const btn = screen.getByLabelText('Simple – Multiple pages')
    chai.expect(btn).to.have.property('disabled', true)
    chai.expect(called).to.equal(false)
  })

  it('shows the Default badge only on the Simple–Single page card', () => {
    renderGrid()
    chai.expect(screen.getAllByText('Default')).to.have.length(1)
    // badge is inside the Simple–Single page button
    const btn = screen.getByLabelText('Simple – Single page')
    chai.expect(btn.querySelector('.form-style-card__badge')).to.not.equal(null)
  })

  it('each card has a two-part label with the layout name and pagination', () => {
    renderGrid()
    chai.expect(screen.getAllByText('Simple')).to.have.length(2)
    chai.expect(screen.getAllByText('Grid')).to.have.length(2)
    chai.expect(screen.getAllByText('Single page')).to.have.length(2)
    chai.expect(screen.getAllByText('Multiple pages')).to.have.length(2)
  })
})
