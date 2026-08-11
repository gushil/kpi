from unittest.mock import MagicMock, patch

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase
from model_bakery import baker
from rest_framework.request import Request

from kobo.apps.oc_tenant_auth.filters import SubdomainAwareObjectPermissionsFilter
from kobo.apps.oc_tenant_auth.models import KeycloakTenantUser
from kpi.models import Asset


class SubdomainAwareObjectPermissionsFilterTestCase(TestCase):
    """
    Regression coverage: surveys owned by another user in the same Keycloak
    subdomain must appear in list results, not just library items.
    """

    def setUp(self):
        self.owner = baker.make(settings.AUTH_USER_MODEL)
        self.viewer = baker.make(settings.AUTH_USER_MODEL)
        KeycloakTenantUser.objects.create(
            UID='owner-uid', user=self.owner, subdomain='demo',
        )
        KeycloakTenantUser.objects.create(
            UID='viewer-uid', user=self.viewer, subdomain='demo',
        )
        self.survey = baker.make(
            Asset, owner=self.owner, asset_type='survey', uid='aSurvey1'
        )

        django_request = RequestFactory().get('/')
        django_request.user = self.viewer
        self.request = Request(django_request)
        self.request.user = self.viewer
        self.view = MagicMock(detail=False)

    def test_includes_survey_owned_by_same_subdomain_user(self):
        filter_backend = SubdomainAwareObjectPermissionsFilter()
        qs = filter_backend.filter_queryset(
            self.request, Asset.objects.all(), self.view
        )
        self.assertIn(self.survey, qs)

    def test_includes_survey_owned_by_same_subdomain_user_on_detail_view(self):
        # The base KpiObjectPermissionsFilter takes a different branch when
        # view.detail is True; confirm the subdomain union still applies.
        self.view.detail = True
        filter_backend = SubdomainAwareObjectPermissionsFilter()
        qs = filter_backend.filter_queryset(
            self.request, Asset.objects.all(), self.view
        )
        self.assertIn(self.survey, qs)

    def test_excludes_survey_owned_by_different_subdomain_user(self):
        other_owner = baker.make(settings.AUTH_USER_MODEL)
        KeycloakTenantUser.objects.create(
            UID='other-owner-uid', user=other_owner, subdomain='other',
        )
        other_survey = baker.make(
            Asset, owner=other_owner, asset_type='survey', uid='aSurvey2'
        )

        filter_backend = SubdomainAwareObjectPermissionsFilter()
        qs = filter_backend.filter_queryset(
            self.request, Asset.objects.all(), self.view
        )
        self.assertNotIn(other_survey, qs)

    def test_anonymous_user_returns_standard_queryset_unchanged(self):
        django_request = RequestFactory().get('/')
        django_request.user = AnonymousUser()
        request = Request(django_request)
        request.user = AnonymousUser()

        sentinel_queryset = MagicMock()
        filter_backend = SubdomainAwareObjectPermissionsFilter()
        with patch(
            'kobo.apps.oc_tenant_auth.filters.KpiObjectPermissionsFilter.'
            'filter_queryset',
            return_value=sentinel_queryset,
        ):
            result = filter_backend.filter_queryset(
                request, Asset.objects.all(), self.view
            )

        self.assertIs(result, sentinel_queryset)

    def test_user_without_keycloak_record_returns_standard_queryset_unchanged(self):
        user_without_keycloak = baker.make(settings.AUTH_USER_MODEL)
        django_request = RequestFactory().get('/')
        django_request.user = user_without_keycloak
        request = Request(django_request)
        request.user = user_without_keycloak

        sentinel_queryset = MagicMock()
        filter_backend = SubdomainAwareObjectPermissionsFilter()
        with patch(
            'kobo.apps.oc_tenant_auth.filters.KpiObjectPermissionsFilter.'
            'filter_queryset',
            return_value=sentinel_queryset,
        ):
            result = filter_backend.filter_queryset(
                request, Asset.objects.all(), self.view
            )

        self.assertIs(result, sentinel_queryset)
