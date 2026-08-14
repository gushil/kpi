import chai from 'chai'
import { buildFieldContext, buildItemDefinition, readItemName } from './logicBuilderContext'

// Minimal Backbone/xlform fakes. A select row answers `_isSelectQuestion()` and
// hands out its choice list via `getList()`, whose `options.models` are Backbone
// models where `get('name')` is the choice VALUE and `get('label')` its label.
function fakeChoiceList(options: Array<{ name: string; label: string }>) {
  return { options: { models: options.map((o) => ({ get: (k: string) => (k === 'name' ? o.name : o.label) })) } }
}

function fakeRow(over: {
  values?: Record<string, string>
  columns?: Record<string, string>
  select?: Array<{ name: string; label: string }>
  survey?: unknown
}) {
  const values = over.values || {}
  const columns = over.columns || {}
  return {
    getValue: (k: string) => values[k] ?? '',
    get: (col: string) => ({ get: (k: string) => (k === 'value' ? (columns[col] ?? '') : undefined) }),
    _isSelectQuestion: () => Boolean(over.select),
    getList: () => (over.select ? fakeChoiceList(over.select) : undefined),
    getSurvey: () => over.survey,
  }
}

describe('buildFieldContext (P1.2)', () => {
  it('includes groups and per-field choices', () => {
    const rows = [
      fakeRow({ values: { name: 'VITALS', type: 'group', label: 'Vitals' } }),
      fakeRow({
        values: { name: 'PREGNANT', type: 'select_one', label: 'Pregnant?' },
        select: [
          { name: 'yes', label: 'Yes' },
          { name: 'no', label: 'No' },
        ],
      }),
    ]
    const survey = {
      forEachRow: (cb: (r: unknown) => void, opts: { includeGroups: boolean }) => {
        chai.expect(opts.includeGroups).to.equal(true)
        rows.forEach(cb)
      },
    }
    const context = buildFieldContext(fakeRow({ survey }))
    chai.expect(context.fields).to.deep.equal([
      { name: 'VITALS', type: 'group', label: 'Vitals' },
      {
        name: 'PREGNANT',
        type: 'select_one',
        label: 'Pregnant?',
        choices: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
      },
    ])
  })

  it('returns an empty list when the survey is unreachable', () => {
    chai.expect(buildFieldContext(fakeRow({ survey: undefined }))).to.deep.equal({ fields: [] })
  })
})

describe('buildItemDefinition (P1.2)', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('reads type/name/label/choices and all six logic columns (repeat_count mapped)', () => {
    const row = fakeRow({
      values: { name: 'BMI', type: 'decimal', label: 'Body Mass Index' },
      columns: { calculation: '${W} div 2', relevant: '${P} = "yes"', repeat_count: '${N} + 1' },
    })
    chai.expect(buildItemDefinition(row)).to.deep.equal({
      name: 'BMI',
      type: 'decimal',
      label: 'Body Mass Index',
      choices: undefined,
      logic: {
        calculation: '${W} div 2',
        default: '',
        constraint: '',
        required: '',
        relevant: '${P} = "yes"',
        repeatCount: '${N} + 1',
      },
    })
    chai.expect(warnSpy.mock.calls.length).to.equal(0)
  })

  it('never throws on a hostile row', () => {
    const hostile = {
      getValue: () => {
        throw new Error('x')
      },
      get: () => {
        throw new Error('x')
      },
    }
    const item = buildItemDefinition(hostile)
    chai.expect(item.name).to.equal('')
    chai.expect(item.logic.calculation).to.equal('')
    // Guarded per read, not once around the loop: every column still reports.
    chai.expect(item.logic).to.deep.equal({
      calculation: '',
      default: '',
      constraint: '',
      required: '',
      relevant: '',
      repeatCount: '',
    })
    chai.expect(warnSpy.mock.calls.length).to.be.above(0)
  })
})

describe('readItemName (P1.2)', () => {
  let warnSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('reads the name off getValue', () => {
    const row = fakeRow({ values: { name: 'BMI' } })
    chai.expect(readItemName(row)).to.equal('BMI')
    chai.expect(buildItemDefinition(row).name).to.equal('BMI')
    chai.expect(warnSpy.mock.calls.length).to.equal(0)
  })

  it('falls back to the name detail model when getValue yields nothing', () => {
    // The one reader the dialog header and the item definition now share:
    // before they were unified only the header did this detail read, so a row
    // in this state sent the model a TARGET ITEM with an empty `- name:`.
    const row = fakeRow({ values: {}, columns: { name: 'PREGNANT' } })
    chai.expect(readItemName(row)).to.equal('PREGNANT')
    chai.expect(buildItemDefinition(row).name).to.equal('PREGNANT')
    chai.expect(warnSpy.mock.calls.length).to.equal(0)
  })

  it("is '' when neither path yields a name", () => {
    chai.expect(readItemName(fakeRow({}))).to.equal('')
    // Row missing both readers entirely: the calls are optional, so no throw.
    chai.expect(readItemName({})).to.equal('')
    chai.expect(warnSpy.mock.calls.length).to.equal(0)
  })

  it("is '' and warns when the getValue read throws", () => {
    // A throwing read aborts the whole expression, so the detail model is not
    // consulted — the dialog header behaved this way before the unification.
    const hostile = {
      getValue: () => {
        throw new Error('x')
      },
      get: () => ({ get: () => 'NOT_REACHED' }),
    }
    chai.expect(readItemName(hostile)).to.equal('')
    chai.expect(warnSpy.mock.calls.length).to.be.above(0)
  })
})
