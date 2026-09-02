import React from 'react'
import { AVAILABLE_FORM_STYLES, type FormStyleDefinition, type FormStyleName } from '#/constants'

// Icons from OC-28582 mockup (viewBox 0 0 48 48, stroke="currentColor")
const FORM_STYLE_ICONS: Record<string, React.ReactNode> = {
  '': (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 48 48'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.6'
      strokeLinejoin='round'
      strokeLinecap='round'
    >
      <rect x='11' y='6' width='26' height='36' rx='2.5' />
      <rect x='15.5' y='13.5' width='17' height='3.4' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
      <rect x='15.5' y='22.3' width='17' height='3.4' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
      <rect x='15.5' y='31.1' width='17' height='3.4' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
    </svg>
  ),
  pages: (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 48 48'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.6'
      strokeLinejoin='round'
      strokeLinecap='round'
    >
      <rect x='17' y='4' width='24' height='33' rx='2.5' opacity='0.45' />
      <rect x='7' y='11' width='24' height='33' rx='2.5' style={{ fill: 'var(--form-card-bg, #fff)' }} />
      <rect x='11.5' y='18' width='15' height='3.4' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
      <rect x='11.5' y='26.5' width='15' height='3.4' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
      <rect x='11.5' y='35' width='15' height='3.4' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
    </svg>
  ),
  'theme-grid': (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 48 48'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.6'
      strokeLinejoin='round'
      strokeLinecap='round'
    >
      <rect x='11' y='6' width='26' height='36' rx='2.5' />
      <rect x='15.5' y='13.5' width='7.3' height='8' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
      <rect x='25.2' y='13.5' width='7.3' height='8' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
      <rect x='15.5' y='25.5' width='17' height='8' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
    </svg>
  ),
  'theme-grid pages': (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 48 48'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.6'
      strokeLinejoin='round'
      strokeLinecap='round'
    >
      <rect x='17' y='4' width='24' height='33' rx='2.5' opacity='0.45' />
      <rect x='7' y='11' width='24' height='33' rx='2.5' style={{ fill: 'var(--form-card-bg, #fff)' }} />
      <rect x='11.5' y='18' width='6.3' height='7.5' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
      <rect x='20.2' y='18' width='6.3' height='7.5' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
      <rect x='11.5' y='29' width='15' height='7.5' rx='1.2' fill='currentColor' stroke='none' opacity='0.85' />
    </svg>
  ),
}

// Two-part display labels: [layout, pagination]
const FORM_STYLE_LABELS: Record<string, [string, string]> = {
  '': [t('Simple'), t('Single page')],
  pages: [t('Simple'), t('Multiple pages')],
  'theme-grid': [t('Grid'), t('Single page')],
  'theme-grid pages': [t('Grid'), t('Multiple pages')],
}

// Aria-label uses en-dash per mockup
const FORM_STYLE_ARIA_LABELS: Record<string, string> = {
  '': t('Simple – Single page'),
  pages: t('Simple – Multiple pages'),
  'theme-grid': t('Grid – Single page'),
  'theme-grid pages': t('Grid – Multiple pages'),
}

// The default card (Simple – Single page) always shows a "Default" badge
const DEFAULT_STYLE_VALUE: FormStyleName = ''

interface FormStyleCardGridProps {
  styleValue?: FormStyleName
  onChange: (style: FormStyleDefinition) => void
  isDisabled?: boolean
}

export default function FormStyleCardGrid(props: FormStyleCardGridProps) {
  // AC5: unrecognised stored value → treat as Simple–Single page (empty)
  const knownValues = AVAILABLE_FORM_STYLES.map((s) => s.value)
  const activeValue: FormStyleName =
    props.styleValue !== undefined && knownValues.includes(props.styleValue) ? props.styleValue : DEFAULT_STYLE_VALUE

  function handleSelect(style: FormStyleDefinition) {
    if (props.isDisabled) return
    if (style.value === activeValue) return
    props.onChange(style)
  }

  return (
    <div className='form-style-card-grid' aria-label={t('Form style')}>
      {AVAILABLE_FORM_STYLES.map((style) => {
        const isSelected = style.value === activeValue
        const isDefault = style.value === DEFAULT_STYLE_VALUE
        const [layout, pagination] = FORM_STYLE_LABELS[style.value] ?? [style.label, '']
        const ariaLabel = FORM_STYLE_ARIA_LABELS[style.value] ?? style.label

        return (
          <button
            key={style.value}
            type='button'
            className={[
              'form-style-card',
              isSelected ? 'form-style-card--selected' : '',
              isDefault && !isSelected ? 'form-style-card--default' : '',
              props.isDisabled ? 'form-style-card--disabled' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-pressed={isSelected}
            aria-label={ariaLabel}
            disabled={props.isDisabled}
            onClick={() => handleSelect(style)}
          >
            {isDefault && <span className='form-style-card__badge'>{t('Default')}</span>}
            <span className='form-style-card__icon'>{FORM_STYLE_ICONS[style.value]}</span>
            <span className='form-style-card__label'>
              <b>{layout}</b>
              <em>{pagination}</em>
            </span>
          </button>
        )
      })}
    </div>
  )
}
