import importlib.util

from django.test import SimpleTestCase


def _package_installed():
    return importlib.util.find_spec('oc_logic_builder_server') is not None


class LogicBuilderAiUrlTestCase(SimpleTestCase):
    """The AI endpoint ships in the PRIVATE oc-logic-builder-server package.
    With it absent (public CI) the path must simply 404; with it installed the
    route must resolve (anything but 404 — DRF auth then owns the response)."""

    def test_route_presence_matches_package_presence(self):
        response = self.client.post('/api/v2/ai/generate-expression/')
        if _package_installed():
            self.assertNotEqual(response.status_code, 404)
        else:
            self.assertEqual(response.status_code, 404)
