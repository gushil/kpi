import chai from 'chai'
import { getOcCsrfToken } from './logicBuilderClient'

describe('getOcCsrfToken (P1.2)', () => {
  it('reads the occsrftoken_v2 cookie', () => {
    Object.defineProperty(document, 'cookie', {
      value: 'a=1; occsrftoken_v2=abcdef0123456789abcdef0123456789; b=2',
      configurable: true,
    })
    chai.expect(getOcCsrfToken()).to.equal('abcdef0123456789abcdef0123456789')
  })

  it('returns null when absent', () => {
    Object.defineProperty(document, 'cookie', { value: 'a=1', configurable: true })
    chai.expect(getOcCsrfToken()).to.equal(null)
  })
})
