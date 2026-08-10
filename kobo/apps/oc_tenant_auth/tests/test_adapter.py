import base64
import json
from unittest.mock import MagicMock, patch

from django.conf import settings
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.cache import cache
from django.test import RequestFactory, TestCase
from model_bakery import baker

from kobo.apps.oc_tenant_auth.adapter import sync_login_state
from kobo.apps.oc_tenant_auth.models import KeycloakTenantUser


def _make_jwt(payload):
    def _b64url(data):
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

    header = _b64url(b'{"alg":"none"}')
    body = _b64url(json.dumps(payload).encode())
    return f'{header}.{body}.sig'


@patch('kobo.apps.oc_tenant_auth.adapter.get_subdomain', return_value='demo')
@patch('kobo.apps.oc_tenant_auth.adapter.requests.get')
class SyncLoginStateTestCase(TestCase):
    """
    Regression coverage for OC-28410: returning logins must refresh
    customer_shared_infra/user_type, not just first-ever signup.
    """

    def setUp(self):
        # Real cache backend persists across tests; clear it so one test's
        # cached customer_uuid response can't leak into another's.
        cache.clear()

        self.user = baker.make(settings.AUTH_USER_MODEL, username='alice+demo')

        request = RequestFactory().get('/')
        SessionMiddleware(lambda r: None).process_request(request)
        request.session.save()
        self.request = request

        self.access_token = _make_jwt({
            'https://www.openclinica.com/userContext': {
                'userUuid': 'user-uuid-1',
                'customerUuid': 'customer-uuid-1',
            },
            'realm_access': {'roles': []},
        })

        self.sociallogin = MagicMock()
        self.sociallogin.account.uid = 'kc-uid-1'
        self.sociallogin.account.extra_data = {
            'https://www.openclinica.com/userContext': {'userType': 'Business Admin'},
        }
        self.sociallogin.token.token = self.access_token

    def _mock_customer_response(self, mock_get, shared_infra):
        mock_get.return_value = MagicMock(
            json=lambda: {'name': 'Acme', 'sharedInfra': shared_infra},
        )
        mock_get.return_value.raise_for_status.return_value = None

    def test_refreshes_shared_infra_and_user_type_on_returning_login(
        self, mock_get, mock_subdomain
    ):
        self._mock_customer_response(mock_get, True)

        # Returning login: row already exists with stale data save_user()
        # never revisits.
        KeycloakTenantUser.objects.create(
            UID='kc-uid-1', user=self.user, subdomain='demo', user_type='Standard',
        )

        sync_login_state(self.request, self.user, self.sociallogin)

        self.assertIs(self.request.session['oc_customer_shared_infra'], True)
        kc_user = KeycloakTenantUser.objects.get(UID='kc-uid-1')
        self.assertEqual(kc_user.user_type, 'Business Admin')
        self.assertEqual(
            mock_get.call_args.kwargs['headers']['Authorization'],
            f'Bearer {self.access_token}',
        )

    def test_creates_keycloak_tenant_user_on_first_login(
        self, mock_get, mock_subdomain
    ):
        self._mock_customer_response(mock_get, False)

        self.assertFalse(KeycloakTenantUser.objects.filter(UID='kc-uid-1').exists())

        sync_login_state(self.request, self.user, self.sociallogin)

        self.assertTrue(KeycloakTenantUser.objects.filter(UID='kc-uid-1').exists())
        self.assertIs(self.request.session['oc_customer_shared_infra'], False)

    def test_reads_user_type_from_nested_userinfo_claim(
        self, mock_get, mock_subdomain
    ):
        # Real Keycloak responses nest userContext under extra_data['userinfo'].
        self._mock_customer_response(mock_get, True)
        self.sociallogin.account.extra_data = {
            'userinfo': {
                'https://www.openclinica.com/userContext': {
                    'userType': 'Business Admin',
                },
            },
        }

        sync_login_state(self.request, self.user, self.sociallogin)

        kc_user = KeycloakTenantUser.objects.get(UID='kc-uid-1')
        self.assertEqual(kc_user.user_type, 'Business Admin')

    def test_handles_null_user_context_claim_without_raising(
        self, mock_get, mock_subdomain
    ):
        # A userContext claim present but set to null must not crash login.
        self._mock_customer_response(mock_get, True)
        self.sociallogin.token.token = _make_jwt({
            'https://www.openclinica.com/userContext': None,
            'realm_access': {'roles': []},
        })

        sync_login_state(self.request, self.user, self.sociallogin)

        self.assertNotIn('oc_customer_shared_infra', self.request.session)

    def test_swallows_unexpected_failure_instead_of_raising(
        self, mock_get, mock_subdomain
    ):
        # A crash here must not propagate: user_logged_in.send() would
        # otherwise block login for every existing user, not just this one.
        self._mock_customer_response(mock_get, True)
        with patch(
            'kobo.apps.oc_tenant_auth.adapter.KeycloakTenantUser.objects.'
            'update_or_create',
            side_effect=Exception('boom'),
        ):
            sync_login_state(self.request, self.user, self.sociallogin)
