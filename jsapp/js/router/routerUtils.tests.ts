import chai from 'chai'
import {
  getCurrentPath,
  getCurrentRoutePath,
  getLoginUrl,
  isMyLibraryRoute,
  isPublicCollectionsRoute,
} from './routerUtils'

function setHash(hash: string) {
  Object.defineProperty(window, 'location', {
    value: { hash },
    writable: true,
    configurable: true,
  })
}

describe('routerUtils', () => {
  describe('getCurrentPath', () => {
    it('returns path with query string intact', () => {
      setHash('#/library/my-library?search=foo')
      chai.expect(getCurrentPath()).to.equal('/library/my-library?search=foo')
    })

    it('returns path without query string when none present', () => {
      setHash('#/library/my-library')
      chai.expect(getCurrentPath()).to.equal('/library/my-library')
    })

    it('returns empty string when no hash fragment', () => {
      setHash('')
      chai.expect(getCurrentPath()).to.equal('')
    })

    it('preserves econsent query param', () => {
      setHash('#/library/asset/new?econsent=ACTIVE&event_type=NONREPEATING_VISIT')
      chai.expect(getCurrentPath()).to.equal('/library/asset/new?econsent=ACTIVE&event_type=NONREPEATING_VISIT')
    })
  })

  describe('getCurrentRoutePath', () => {
    it('strips query string for route matching', () => {
      setHash('#/library/my-library?search=foo')
      chai.expect(getCurrentRoutePath()).to.equal('/library/my-library')
    })

    it('returns path unchanged when no query string', () => {
      setHash('#/library/my-library')
      chai.expect(getCurrentRoutePath()).to.equal('/library/my-library')
    })

    it('strips econsent param', () => {
      setHash('#/library/asset/new?econsent=ACTIVE')
      chai.expect(getCurrentRoutePath()).to.equal('/library/asset/new')
    })
  })

  describe('getLoginUrl', () => {
    it('encodes full path including query string into next param', () => {
      setHash('#/library/asset/new?econsent=ACTIVE&event_type=NONREPEATING_VISIT')
      const url = getLoginUrl()
      const next = new URLSearchParams(url.split('?')[1]).get('next')
      chai.expect(next).to.equal('/#/library/asset/new?econsent=ACTIVE&event_type=NONREPEATING_VISIT')
    })

    it('returns login url with next param for plain path', () => {
      setHash('#/forms/aAbBcC123')
      const url = getLoginUrl()
      chai.expect(url).to.include('next=')
      chai.expect(url).to.include(encodeURIComponent('/#/forms/aAbBcC123'))
    })
  })

  describe('isMyLibraryRoute', () => {
    it('returns true when on my-library route without query string', () => {
      setHash('#/library/my-library')
      chai.expect(isMyLibraryRoute()).to.equal(true)
    })

    it('returns true when on my-library route with search query string', () => {
      setHash('#/library/my-library?search=glucose+tolerance')
      chai.expect(isMyLibraryRoute()).to.equal(true)
    })

    it('returns false for other library routes', () => {
      setHash('#/library/public-collections')
      chai.expect(isMyLibraryRoute()).to.equal(false)
    })
  })

  describe('isPublicCollectionsRoute', () => {
    it('returns true when on public-collections route without query string', () => {
      setHash('#/library/public-collections')
      chai.expect(isPublicCollectionsRoute()).to.equal(true)
    })

    it('returns true when on public-collections route with query string', () => {
      setHash('#/library/public-collections?search=foo')
      chai.expect(isPublicCollectionsRoute()).to.equal(true)
    })

    it('returns false for my-library route', () => {
      setHash('#/library/my-library')
      chai.expect(isPublicCollectionsRoute()).to.equal(false)
    })
  })
})
