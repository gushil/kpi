import importlib.util

from django.test import TestCase


def _package_installed():
    # Mirrors the two-stage guard in kpi/urls/router_api_v2.py exactly: a
    # parent-only check would claim the route exists for a partially installed
    # package (parent importable, `django` subpackage missing). The parent check
    # must short-circuit the second, because find_spec() on a dotted name whose
    # parent is absent raises rather than returning None.
    return (
        importlib.util.find_spec('oc_logic_builder_server') is not None
        and importlib.util.find_spec('oc_logic_builder_server.django') is not None
    )


class LogicBuilderAiUrlTestCase(TestCase):
    """The AI endpoint ships in the PRIVATE oc-logic-builder-server package.
    With it absent (public CI) the path must simply 404; with it installed the
    route must resolve (anything but 404 — DRF auth then owns the response).

    DB-backed rather than a SimpleTestCase because the 404 branch does not stay
    out of the database: kpi's `handler404` (`render404`) renders
    `custom_404.html`, and its `custom_password_guidance_text` context
    processor reads constance config, which testing settings leave uncached.
    TestCase rolls that back per test, keeping the isolation a SimpleTestCase
    with `databases` opened up would have given away.
    """

    def test_route_presence_matches_package_presence(self):
        response = self.client.post('/api/v2/ai/generate-expression/')
        if _package_installed():
            self.assertNotEqual(response.status_code, 404)
        else:
            self.assertEqual(response.status_code, 404)
