from django.conf import settings
from django.contrib.sessions.middleware import SessionMiddleware
from django.test import RequestFactory, TestCase
from model_bakery import baker

from kobo.apps.oc_tenant_auth.middleware import SDUserSwitchMiddleware

LOGIN_PATH = '/accounts/oidc/keycloak/login/'


def _sentinel_response(request):
    """Shows that the middleware let the request through."""
    return 'passed-through'


class SDLoginIdReAuthTestCase(TestCase):
    """
    OC-28540: FD only updates the user type when it logs in, so a new SD login
    id must make it log in again.
    """

    def setUp(self):
        self.user = baker.make(settings.AUTH_USER_MODEL, username='alice+demo')
        self.middleware = SDUserSwitchMiddleware(_sentinel_response)

    def _request(self, query, session_data=None, user=None):
        request = RequestFactory().get(f'/{query}')
        SessionMiddleware(lambda r: None).process_request(request)
        for key, value in (session_data or {}).items():
            request.session[key] = value
        request.session.save()
        request.user = user if user is not None else self.user
        return request

    def test_new_sd_login_id_forces_oidc_reauth(self):
        request = self._request(
            '?oc_sd_user=alice&oc_sd_login_id=login-2',
            session_data={'oc_sd_login_id': 'login-1'},
        )

        response = self.middleware(request)

        self.assertEqual(response.status_code, 302)
        self.assertIn(LOGIN_PATH, response['Location'])

    def test_new_sd_login_id_is_stored_before_the_redirect(self):
        """logout() clears the session, so the id must be stored after it.
        If not, every request would redirect."""
        request = self._request(
            '?oc_sd_user=alice&oc_sd_login_id=login-2',
            session_data={'oc_sd_login_id': 'login-1'},
        )

        self.middleware(request)

        self.assertEqual(request.session.get('oc_sd_login_id'), 'login-2')

    def test_session_without_a_stored_login_id_is_adopted_without_reauth(self):
        """Older sessions have no stored id. Treating that as a change would
        make every open session log in again."""
        request = self._request('?oc_sd_user=alice&oc_sd_login_id=login-1')

        response = self.middleware(request)

        self.assertEqual(response, 'passed-through')
        self.assertEqual(request.session.get('oc_sd_login_id'), 'login-1')

    def test_unchanged_login_id_does_not_reauth(self):
        """Opening a board as usual must not cause a Keycloak call."""
        request = self._request(
            '?oc_sd_user=alice&oc_sd_login_id=login-1',
            session_data={'oc_sd_login_id': 'login-1'},
        )

        self.assertEqual(self.middleware(request), 'passed-through')

    def test_request_without_login_id_is_untouched(self):
        """The Design click's FD iframe sends no login id
        (Utils.buildFDEditUrl in wekan-oc), so it must pass through."""
        request = self._request(
            '?oc_sd_user=alice', session_data={'oc_sd_login_id': 'login-1'}
        )

        self.assertEqual(self.middleware(request), 'passed-through')

    def test_anonymous_request_is_untouched(self):
        from django.contrib.auth.models import AnonymousUser

        request = self._request(
            '?oc_sd_login_id=login-2', user=AnonymousUser()
        )

        self.assertEqual(self.middleware(request), 'passed-through')

    def test_username_mismatch_still_takes_precedence(self):
        """The older OC-28410 behaviour must keep working."""
        request = self._request(
            '?oc_sd_user=bob&oc_sd_login_id=login-1',
            session_data={'oc_sd_login_id': 'login-1'},
        )

        response = self.middleware(request)

        self.assertEqual(response.status_code, 302)
        self.assertIn(LOGIN_PATH, response['Location'])
