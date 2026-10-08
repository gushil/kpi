from unittest.mock import MagicMock, patch

from django.test import TestCase

from kobo.apps.oc_tenant_auth.permissions import (
    AssetObjectPermission,
    SubdomainAwareAssetSnapshotPermission,
)
from kpi.exceptions import InvalidPasswordAPIException


class AssetObjectPermissionTestCase(TestCase):
    def setUp(self):
        self.permission = AssetObjectPermission()
        self.request = MagicMock(user=MagicMock(is_authenticated=True))
        self.view = MagicMock()
        # asset_type is deliberately 'survey' — the type this permission used
        # to exclude from subdomain sharing.
        self.obj = MagicMock(asset_type='survey', owner_id=1)

    @patch(
        'kobo.apps.oc_tenant_auth.permissions.is_owner_in_subdomain',
        return_value=True,
    )
    def test_grants_access_to_any_asset_type_in_same_subdomain(self, mock_subdomain):
        self.assertTrue(
            self.permission.has_object_permission(self.request, self.view, self.obj)
        )
        mock_subdomain.assert_called_once_with(self.request.user, self.obj.owner_id)

    @patch('kpi.permissions.AssetPermission.has_object_permission', return_value=False)
    @patch(
        'kobo.apps.oc_tenant_auth.permissions.is_owner_in_subdomain',
        return_value=False,
    )
    def test_falls_back_to_standard_check_for_different_subdomain(
        self, mock_subdomain, mock_super
    ):
        self.assertFalse(
            self.permission.has_object_permission(self.request, self.view, self.obj)
        )
        mock_super.assert_called_once()

    @patch('kpi.permissions.AssetPermission.has_object_permission', return_value=False)
    @patch(
        'kobo.apps.oc_tenant_auth.permissions.is_owner_in_subdomain',
        side_effect=Exception('boom'),
    )
    def test_subdomain_lookup_failure_falls_back_safely(
        self, mock_subdomain, mock_super
    ):
        self.assertFalse(
            self.permission.has_object_permission(self.request, self.view, self.obj)
        )


class SubdomainAwareAssetSnapshotPermissionTestCase(TestCase):
    def setUp(self):
        self.permission = SubdomainAwareAssetSnapshotPermission()
        self.request = MagicMock(user=MagicMock(is_authenticated=True))
        self.view = MagicMock()
        self.obj = MagicMock(asset=MagicMock(asset_type='survey', owner_id=1))

    @patch(
        'kobo.apps.oc_tenant_auth.permissions.is_owner_in_subdomain',
        return_value=True,
    )
    def test_grants_snapshot_access_for_any_asset_type_in_same_subdomain(
        self, mock_subdomain
    ):
        self.assertTrue(
            self.permission.has_object_permission(self.request, self.view, self.obj)
        )

    @patch(
        'kpi.permissions.AssetSnapshotPermission.has_object_permission',
        return_value=False,
    )
    @patch(
        'kobo.apps.oc_tenant_auth.permissions.is_owner_in_subdomain',
        return_value=False,
    )
    def test_falls_back_to_standard_check_for_different_subdomain(
        self, mock_subdomain, mock_super
    ):
        self.assertFalse(
            self.permission.has_object_permission(self.request, self.view, self.obj)
        )
        mock_super.assert_called_once()

    @patch('kpi.permissions.AssetSnapshotPermission.has_permission')
    def test_snapshot_xml_skips_model_level_check(self, mock_super):
        self.view.action = 'retrieve'
        self.request.accepted_renderer.format = 'xml'
        for is_authenticated in (True, False):
            self.request.user.is_authenticated = is_authenticated
            with patch.object(self.permission, 'validate_password') as mock_validate:
                self.assertTrue(self.permission.has_permission(self.request, self.view))
            mock_validate.assert_called_once_with(self.request)
        mock_super.assert_not_called()

    @patch('kpi.permissions.AssetSnapshotPermission.has_permission', return_value=False)
    def test_other_requests_use_standard_check(self, mock_super):
        for action, fmt in (
            ('retrieve', 'json'),
            ('list', 'xml'),
            ('form_list', 'xml'),
        ):
            self.view.action = action
            self.request.accepted_renderer.format = fmt
            with patch.object(self.permission, 'validate_password'):
                self.assertFalse(
                    self.permission.has_permission(self.request, self.view)
                )
        self.assertEqual(mock_super.call_count, 3)

    @patch('kpi.permissions.AssetSnapshotPermission.has_permission')
    def test_invalid_password_raises_before_snapshot_xml_shortcut(self, mock_super):
        self.view.action = 'retrieve'
        self.request.accepted_renderer.format = 'xml'
        with patch.object(
            self.permission,
            'validate_password',
            side_effect=InvalidPasswordAPIException,
        ):
            with self.assertRaises(InvalidPasswordAPIException):
                self.permission.has_permission(self.request, self.view)
        mock_super.assert_not_called()
