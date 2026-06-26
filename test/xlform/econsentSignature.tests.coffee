{expect} = require('../helper/fauxChai')

econsentSignature = require('../../jsapp/js/components/formBuilder/econsentSignature')

do ->
  describe 'econsentSignature helpers', ->
    describe 'isEConsentEnabledStatus', ->
      it 'returns true for ACTIVE', ->
        expect(econsentSignature.isEConsentEnabledStatus('ACTIVE')).toBe(true)

      it 'returns true for PENDING', ->
        expect(econsentSignature.isEConsentEnabledStatus('PENDING')).toBe(true)

      it 'returns false for other statuses', ->
        expect(econsentSignature.isEConsentEnabledStatus('INACTIVE')).toBe(false)
        expect(econsentSignature.isEConsentEnabledStatus(null)).toBe(false)

    describe 'isEConsentAllowedEventType', ->
      it 'returns true for NONREPEATING_VISIT', ->
        expect(econsentSignature.isEConsentAllowedEventType('NONREPEATING_VISIT')).toBe(true)

      it 'returns false for REPEATING_VISIT', ->
        expect(econsentSignature.isEConsentAllowedEventType('REPEATING_VISIT')).toBe(false)

      it 'returns false for NONREPEATING_COMMON', ->
        expect(econsentSignature.isEConsentAllowedEventType('NONREPEATING_COMMON')).toBe(false)

      it 'returns false for REPEATING_COMMON', ->
        expect(econsentSignature.isEConsentAllowedEventType('REPEATING_COMMON')).toBe(false)

      it 'returns true when event type is null (no event context, e.g. Library editing)', ->
        expect(econsentSignature.isEConsentAllowedEventType(null)).toBe(true)

      it 'returns true when event type is undefined (no event context)', ->
        expect(econsentSignature.isEConsentAllowedEventType(undefined)).toBe(true)

      it 'returns false for an unknown/unrecognised event type value', ->
        expect(econsentSignature.isEConsentAllowedEventType('SOMETHING_ELSE')).toBe(false)

    describe 'getFormEventType', ->
      beforeEach ->
        # Reset hash before each test
        window.location.hash = ''

      it 'returns event_type from URL hash query params', ->
        window.location.hash = '#/forms/uid/edit?econsent=ACTIVE&event_type=NONREPEATING_VISIT'
        expect(econsentSignature.getFormEventType()).toBe('NONREPEATING_VISIT')

      it 'returns REPEATING_VISIT when set', ->
        window.location.hash = '#/forms/uid/edit?econsent=ACTIVE&event_type=REPEATING_VISIT'
        expect(econsentSignature.getFormEventType()).toBe('REPEATING_VISIT')

      it 'returns null when event_type param is absent', ->
        window.location.hash = '#/forms/uid/edit?econsent=ACTIVE'
        expect(econsentSignature.getFormEventType()).toBe(null)

      it 'returns null when there are no query params', ->
        window.location.hash = '#/forms/uid/edit'
        expect(econsentSignature.getFormEventType()).toBe(null)

      it 'returns empty string when event_type param is present but empty', ->
        window.location.hash = '#/forms/uid/edit?event_type='
        expect(econsentSignature.getFormEventType()).toBe('')

    describe 'isEConsentSignatureItemTypeAllowed (combined gating)', ->
      beforeEach ->
        window.location.hash = ''

      it 'returns true when econsent is ACTIVE and event type is NONREPEATING_VISIT', ->
        window.location.hash = '#/forms/uid/edit?econsent=ACTIVE&event_type=NONREPEATING_VISIT'
        expect(econsentSignature.isEConsentSignatureItemTypeAllowed()).toBe(true)

      it 'returns true when econsent is PENDING and event type is NONREPEATING_VISIT', ->
        window.location.hash = '#/forms/uid/edit?econsent=PENDING&event_type=NONREPEATING_VISIT'
        expect(econsentSignature.isEConsentSignatureItemTypeAllowed()).toBe(true)

      it 'returns false when econsent is ACTIVE but event type is REPEATING_VISIT', ->
        window.location.hash = '#/forms/uid/edit?econsent=ACTIVE&event_type=REPEATING_VISIT'
        expect(econsentSignature.isEConsentSignatureItemTypeAllowed()).toBe(false)

      it 'returns false when econsent is ACTIVE but event type is NONREPEATING_COMMON', ->
        window.location.hash = '#/forms/uid/edit?econsent=ACTIVE&event_type=NONREPEATING_COMMON'
        expect(econsentSignature.isEConsentSignatureItemTypeAllowed()).toBe(false)

      it 'returns false when econsent is ACTIVE but event type is REPEATING_COMMON', ->
        window.location.hash = '#/forms/uid/edit?econsent=ACTIVE&event_type=REPEATING_COMMON'
        expect(econsentSignature.isEConsentSignatureItemTypeAllowed()).toBe(false)

      it 'returns false when econsent is PENDING but event type is REPEATING_VISIT', ->
        window.location.hash = '#/forms/uid/edit?econsent=PENDING&event_type=REPEATING_VISIT'
        expect(econsentSignature.isEConsentSignatureItemTypeAllowed()).toBe(false)

      it 'returns false when econsent module is not enabled regardless of event type', ->
        window.location.hash = '#/forms/uid/edit?econsent=INACTIVE&event_type=NONREPEATING_VISIT'
        expect(econsentSignature.isEConsentSignatureItemTypeAllowed()).toBe(false)

      it 'returns true when econsent is ACTIVE and no event_type param (Library editing)', ->
        window.location.hash = '#/forms/uid/edit?econsent=ACTIVE'
        expect(econsentSignature.isEConsentSignatureItemTypeAllowed()).toBe(true)

      it 'returns false when econsent is not set even if event type is NONREPEATING_VISIT', ->
        window.location.hash = '#/forms/uid/edit?event_type=NONREPEATING_VISIT'
        expect(econsentSignature.isEConsentSignatureItemTypeAllowed()).toBe(false)

    describe 'appendEConsentQueryToPath', ->
      it 'appends econsent when status is enabled', ->
        expect(
          econsentSignature.appendEConsentQueryToPath('/library/asset/new', 'ACTIVE')
        ).toBe('/library/asset/new?econsent=ACTIVE')

      it 'removes stale econsent when status is not enabled', ->
        expect(
          econsentSignature.appendEConsentQueryToPath(
            '/library/asset/new?econsent=ACTIVE',
            null
          )
        ).toBe('/library/asset/new')

      it 'preserves hash fragments', ->
        expect(
          econsentSignature.appendEConsentQueryToPath(
            '/library/asset/new#section',
            'PENDING'
          )
        ).toBe('/library/asset/new?econsent=PENDING#section')

      it 'strips econsent without losing fragment or other query params', ->
        expect(
          econsentSignature.appendEConsentQueryToPath(
            '/library/asset/new?econsent=ACTIVE&foo=bar#section',
            'INACTIVE'
          )
        ).toBe('/library/asset/new?foo=bar#section')

    describe 'getEConsentStatusFromRouter', ->
      it 'reads econsent from router searchParams', ->
        router =
          searchParams: new URLSearchParams('econsent=PENDING')
          navigate: ->
        expect(econsentSignature.getEConsentStatusFromRouter(router)).toBe('PENDING')
