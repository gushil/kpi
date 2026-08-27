import logging
from urllib.parse import urlencode

from django.contrib.auth import logout
from django.shortcuts import redirect
from django.urls import reverse

LOGGER = logging.getLogger(__name__)


def _force_oidc_reauth(request):
    """Ends the FD session and sends the request to Keycloak again."""
    logout(request)
    login_url = reverse('openid_connect_login', kwargs={'provider_id': 'keycloak'})
    next_qs = urlencode({'next': request.get_full_path()})
    return redirect(f'{login_url}?{next_qs}')


class SDUserSwitchMiddleware:
    """
    Makes FD log in again when the SD username changes (OC-28410) or the SD
    login id changes (OC-28540). Both are sent by wekan-oc in the iframe URL.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated:
            return self.get_response(request)

        sd_user = request.GET.get('oc_sd_user')
        if sd_user:
            # Derive base username from the Django user object (always available
            # for authenticated users). The stored session key is used as a
            # fallback but may be absent for sessions created before this feature.
            fd_base = (
                request.session.get('oc_fd_base_username')
                or request.user.username.rsplit('+', 1)[0]
            )
            if fd_base != sd_user:
                LOGGER.info(
                    'SDUserSwitch: SD user %s != FD user %s — forcing OIDC re-auth',
                    sd_user,
                    fd_base,
                )
                return _force_oidc_reauth(request)

            # Only read the login id next to a username. Study Designer always
            # sends both, and alone it would let any URL end a session.
            sd_login_id = request.GET.get('oc_sd_login_id')
            if not sd_login_id:
                return self.get_response(request)
            stored_login_id = request.session.get('oc_sd_login_id')
            if not stored_login_id:
                # Store the first id we see. A missing id is not a change, or
                # every open session would log in again when this ships.
                request.session['oc_sd_login_id'] = sd_login_id
            elif stored_login_id != sd_login_id:
                LOGGER.info(
                    'SDUserSwitch: new SD login id %s (was %s) — forcing OIDC '
                    're-auth to refresh user_type',
                    sd_login_id,
                    stored_login_id,
                )
                response = _force_oidc_reauth(request)
                # logout() clears the session, so store the id after it. This
                # stops repeat redirects if the later refresh fails.
                request.session['oc_sd_login_id'] = sd_login_id
                return response
        return self.get_response(request)
