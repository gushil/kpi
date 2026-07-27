# coding: utf-8
from unittest.mock import patch

import responses
from django.conf import settings
from django.core.cache import cache
from django.test import RequestFactory, TestCase, override_settings

from kobo.apps.kobo_auth.shortcuts import User
from kpi.models import Asset, AssetSnapshot
from kpi.utils.study_designer_preview import (
    decorate_snapshot_with_study_designer_preview,
)


@override_settings(OC_BUILD_URL='http://form-service.test')
class DecorateSnapshotWithStudyDesignerPreviewTest(TestCase):
    fixtures = ['test_data']

    def setUp(self):
        cache.clear()
        self.user = User.objects.get(username='someuser')
        self.asset = Asset.objects.create(
            content={
                'survey': [{'type': 'text', 'label': 'Q1', 'name': 'q1'}],
                'settings': {},
            },
            owner=self.user,
            asset_type='survey',
        )
        self.snapshot = AssetSnapshot.objects.create(
            asset=self.asset,
            source=self.asset.content,
        )
        self.request = RequestFactory().get('/')
        self.form_service_url = (
            f'{settings.OC_BUILD_URL}/form-service/api/xlsForm/generateXform'
        )

    def _mock_keycloak(self, mock_realm, mock_secret, mock_keycloak_cls):
        mock_realm.return_value = 'test-realm'
        mock_secret.return_value = 'test-secret'
        mock_keycloak_cls.return_value.token.return_value = {
            'access_token': 'test-token',
            'expires_in': 300,
        }

    @patch('kpi.utils.study_designer_preview.KeycloakOpenID')
    @patch('kpi.utils.study_designer_preview._cached_client_secret')
    @patch('kpi.utils.study_designer_preview._cached_realm_name')
    @responses.activate
    def test_replaces_xml_on_success(self, mock_realm, mock_secret, mock_keycloak):
        self._mock_keycloak(mock_realm, mock_secret, mock_keycloak)
        responses.add(
            responses.POST,
            self.form_service_url,
            body='<h:html><!-- decorated --></h:html>',
            status=200,
        )

        original_xml = self.snapshot.xml
        decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)

        # The in-memory instance should already reflect the decorated XML,
        # without needing a DB refresh.
        self.assertEqual(self.snapshot.xml, '<h:html><!-- decorated --></h:html>')

        self.snapshot.refresh_from_db()
        self.assertEqual(self.snapshot.xml, '<h:html><!-- decorated --></h:html>')
        self.assertNotEqual(self.snapshot.xml, original_xml)

        sent_request = responses.calls[0].request
        self.assertIn(b'rewrite_media_references', sent_request.body)
        self.assertIn(b'false', sent_request.body)
        self.assertNotIn(b'media_base_url', sent_request.body)
        self.assertEqual(sent_request.headers['Authorization'], 'Bearer test-token')

    @patch('kpi.utils.study_designer_preview.KeycloakOpenID')
    @patch('kpi.utils.study_designer_preview._cached_client_secret')
    @patch('kpi.utils.study_designer_preview._cached_realm_name')
    @responses.activate
    def test_falls_back_on_non_200(self, mock_realm, mock_secret, mock_keycloak):
        self._mock_keycloak(mock_realm, mock_secret, mock_keycloak)
        responses.add(responses.POST, self.form_service_url, status=400)

        original_xml = self.snapshot.xml
        decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)

        self.snapshot.refresh_from_db()
        self.assertEqual(self.snapshot.xml, original_xml)

    @patch('kpi.utils.study_designer_preview.KeycloakOpenID')
    @patch('kpi.utils.study_designer_preview._cached_client_secret')
    @patch('kpi.utils.study_designer_preview._cached_realm_name')
    @responses.activate
    def test_falls_back_on_blank_200_body(self, mock_realm, mock_secret, mock_keycloak):
        self._mock_keycloak(mock_realm, mock_secret, mock_keycloak)
        responses.add(responses.POST, self.form_service_url, body='   ', status=200)

        original_xml = self.snapshot.xml
        decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)

        self.snapshot.refresh_from_db()
        self.assertEqual(self.snapshot.xml, original_xml)

    @patch('kpi.utils.study_designer_preview.KeycloakOpenID')
    @patch('kpi.utils.study_designer_preview._cached_client_secret')
    @patch('kpi.utils.study_designer_preview._cached_realm_name')
    @responses.activate
    def test_falls_back_on_malformed_200_body(
        self, mock_realm, mock_secret, mock_keycloak
    ):
        self._mock_keycloak(mock_realm, mock_secret, mock_keycloak)
        responses.add(
            responses.POST,
            self.form_service_url,
            body='not xml at all',
            status=200,
        )

        original_xml = self.snapshot.xml
        decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)

        self.snapshot.refresh_from_db()
        self.assertEqual(self.snapshot.xml, original_xml)

    @patch('kpi.utils.study_designer_preview.KeycloakOpenID')
    @patch('kpi.utils.study_designer_preview._cached_client_secret')
    @patch('kpi.utils.study_designer_preview._cached_realm_name')
    @responses.activate
    def test_falls_back_on_connection_error(
        self, mock_realm, mock_secret, mock_keycloak
    ):
        self._mock_keycloak(mock_realm, mock_secret, mock_keycloak)
        # No responses.add() registered for this URL -> requests raises ConnectionError

        original_xml = self.snapshot.xml
        decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)

        self.snapshot.refresh_from_db()
        self.assertEqual(self.snapshot.xml, original_xml)

    @patch('kpi.utils.study_designer_preview._cached_realm_name')
    def test_falls_back_on_realm_resolution_failure(self, mock_realm):
        mock_realm.side_effect = Exception('boom')

        original_xml = self.snapshot.xml
        decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)

        self.snapshot.refresh_from_db()
        self.assertEqual(self.snapshot.xml, original_xml)

    @patch('kpi.utils.study_designer_preview.KeycloakOpenID')
    @patch('kpi.utils.study_designer_preview._cached_client_secret')
    @patch('kpi.utils.study_designer_preview._cached_realm_name')
    def test_falls_back_on_to_xlsx_io_raising(
        self, mock_realm, mock_secret, mock_keycloak
    ):
        self._mock_keycloak(mock_realm, mock_secret, mock_keycloak)

        original_xml = self.snapshot.xml
        with patch.object(
            AssetSnapshot, 'to_xlsx_io', side_effect=Exception('bad xlsx')
        ):
            decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)

        self.snapshot.refresh_from_db()
        self.assertEqual(self.snapshot.xml, original_xml)

    @patch('kpi.utils.study_designer_preview.KeycloakOpenID')
    @patch('kpi.utils.study_designer_preview._cached_client_secret')
    @patch('kpi.utils.study_designer_preview._cached_realm_name')
    @responses.activate
    def test_caches_token_across_calls(self, mock_realm, mock_secret, mock_keycloak):
        self._mock_keycloak(mock_realm, mock_secret, mock_keycloak)
        responses.add(
            responses.POST,
            self.form_service_url,
            body='<h:html></h:html>',
            status=200,
        )

        decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)
        decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)

        self.assertEqual(mock_keycloak.return_value.token.call_count, 1)

    @patch('kpi.utils.study_designer_preview.KeycloakOpenID')
    @patch('kpi.utils.study_designer_preview._cached_client_secret')
    @patch('kpi.utils.study_designer_preview._cached_realm_name')
    def test_falls_back_when_client_secret_missing(
        self, mock_realm, mock_secret, mock_keycloak
    ):
        mock_realm.return_value = 'test-realm'
        mock_secret.return_value = None

        original_xml = self.snapshot.xml
        decorate_snapshot_with_study_designer_preview(self.snapshot, self.request)

        # Should skip requesting a token entirely rather than fail repeatedly.
        mock_keycloak.assert_not_called()

        self.snapshot.refresh_from_db()
        self.assertEqual(self.snapshot.xml, original_xml)
