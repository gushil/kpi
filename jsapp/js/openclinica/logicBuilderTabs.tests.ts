import chai from 'chai'
import { GENERATE_REQUEST_KEY, columnToTab } from './logicBuilderTabs'

describe('logicBuilderTabs (P1.1)', () => {
  it('maps every xlform logic column to its package tab', () => {
    chai.expect(columnToTab('calculation')).to.equal('calculation')
    chai.expect(columnToTab('default')).to.equal('default')
    chai.expect(columnToTab('constraint')).to.equal('constraint')
    chai.expect(columnToTab('required')).to.equal('required')
    chai.expect(columnToTab('relevant')).to.equal('relevant')
    chai.expect(columnToTab('repeat_count')).to.equal('repeatCount')
  })

  it('returns undefined for an unknown column', () => {
    chai.expect(columnToTab('label')).to.equal(undefined)
    chai.expect(columnToTab('')).to.equal(undefined)
  })

  it('exposes the surveyState key the dialog wiring depends on', () => {
    chai.expect(GENERATE_REQUEST_KEY).to.equal('generateRequest')
  })
})
