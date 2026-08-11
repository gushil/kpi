from unittest.mock import MagicMock, patch

from django.conf import settings
from django.test import RequestFactory, TestCase
from model_bakery import baker

from kobo.apps.oc_tenant_auth.signals import refresh_login_state


class RefreshLoginStateTestCase(TestCase):
    def setUp(self):
        self.user = baker.make(settings.AUTH_USER_MODEL)
        self.request = RequestFactory().get('/')

    @patch('kobo.apps.oc_tenant_auth.signals.sync_login_state')
    def test_syncs_on_social_login(self, mock_sync):
        sociallogin = MagicMock()
        refresh_login_state(
            sender=self.user.__class__,
            request=self.request,
            user=self.user,
            sociallogin=sociallogin,
        )
        mock_sync.assert_called_once_with(self.request, self.user, sociallogin)

    @patch('kobo.apps.oc_tenant_auth.signals.sync_login_state')
    def test_ignores_non_social_login(self, mock_sync):
        # e.g. Django admin password login — no sociallogin in signal_kwargs
        refresh_login_state(
            sender=self.user.__class__, request=self.request, user=self.user,
        )
        mock_sync.assert_not_called()
