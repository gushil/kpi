from unittest.mock import MagicMock, patch

from django.test import TestCase

from kobo.apps.oc_tenant_auth.permissions import (
    AssetObjectPermission,
    SubdomainAwareAssetSnapshotPermission,
)


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
