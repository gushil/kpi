import { MantineProvider } from '@mantine/core'
import { render, fireEvent } from '@testing-library/react'
import chai from 'chai'
import React from 'react'
import type { Asset } from '#/api/models/asset'
import { AssetTypeEnum } from '#/api/models/assetTypeEnum'
import AssetNavigatorCard from './AssetNavigatorCard'

function makeAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    uid: 'aTestUid001',
    name: 'Test Question',
    asset_type: AssetTypeEnum.question,
    summary: {},
    ...overrides,
  } as Asset
}

function renderCard(props: { onAdd?: (uid: string) => void; asset?: Asset } = {}) {
  const onAdd = props.onAdd ?? (() => undefined)
  const asset = props.asset ?? makeAsset()
  return render(
    <MantineProvider>
      <AssetNavigatorCard asset={asset} className='test-card' isExpanded={false} onAdd={onAdd} />
    </MantineProvider>
  )
}

describe('AssetNavigatorCard — OC-28489 non-drag add button', () => {
  it('renders the add button with the correct aria-label', () => {
    const { getByRole } = renderCard()
    const btn = getByRole('button', { name: 'Add to form' })
    chai.expect(btn).to.exist
  })

  it('add button carries the CSS class used for the focus-ring rule', () => {
    const { getByRole } = renderCard()
    const btn = getByRole('button', { name: 'Add to form' })
    chai.expect(btn.classList.contains('asset-navigator-card__add-btn')).to.equal(true)
  })

  it('calls onAdd with the asset uid when the button is clicked', () => {
    const calls: string[] = []
    const { getByRole } = renderCard({ onAdd: (uid) => calls.push(uid) })
    fireEvent.click(getByRole('button', { name: 'Add to form' }))
    chai.expect(calls).to.deep.equal(['aTestUid001'])
  })

  it('does not propagate the click event to the card (drag handler)', () => {
    let bubbled = false
    const { container } = renderCard()
    container.firstElementChild!.addEventListener('click', () => {
      bubbled = true
    })
    const btn = container.querySelector('.asset-navigator-card__add-btn')!
    fireEvent.click(btn)
    chai.expect(bubbled).to.equal(false)
  })
})
