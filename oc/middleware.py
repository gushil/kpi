from __future__ import unicode_literals

import time
import logging
import re
from importlib import import_module
from urllib.parse import urlparse

from django.conf import settings
from django.core.exceptions import DisallowedHost, ImproperlyConfigured, SuspiciousOperation
from django.contrib.sessions.backends.base import UpdateError
from django.urls import get_callable
from django.http.response import HttpResponse
from django.utils.http import cookie_date
from django.utils.cache import patch_vary_headers
from django.utils.crypto import constant_time_compare, get_random_string
from django.utils.deprecation import MiddlewareMixin
from django.utils.http import is_same_domain, http_date
from django.utils.log import log_response
from django.utils.encoding import force_text

from django.contrib.sessions.middleware import SessionMiddleware
from django.middleware.csrf import CsrfViewMiddleware, REASON_NO_REFERER, REASON_BAD_REFERER, REASON_NO_CSRF_COOKIE, REASON_BAD_TOKEN, CSRF_SECRET_LENGTH, CSRF_TOKEN_LENGTH, CSRF_ALLOWED_CHARS, CSRF_SESSION_KEY
from http.cookies import Morsel

Morsel._reserved["samesite"] = "SameSite"
Morsel._reserved.update({"samesite": "SameSite"})
logger = logging.getLogger('oc.middleware')

def _get_current_domain(request):
    full_uri_with_path = request.build_absolute_uri()
    parsed_full_uri_with_path = urlparse(full_uri_with_path)
    return parsed_full_uri_with_path.netloc

class OCSessionMiddleware(SessionMiddleware):
    def process_response(self, request, response):
        """"
        If request.session was modified, or if the configuration is to save the
        session every time, save the changes and set a session cookie or delete
        the session cookie if the session has been emptied.
        """
        try:
            accessed = request.session.accessed
            modified = request.session.modified
            empty = request.session.is_empty()
        except AttributeError:
            pass
        else:
            # First check if we need to delete this cookie.
            # The session should be deleted only if the session is entirely empty
            if settings.SESSION_COOKIE_NAME in request.COOKIES and empty:
                response.delete_cookie(settings.SESSION_COOKIE_NAME,
                    domain=_get_current_domain(request))
            else:
                if accessed:
                    patch_vary_headers(response, ('Cookie',))
                if (modified or settings.SESSION_SAVE_EVERY_REQUEST) and not empty:
                    if request.session.get_expire_at_browser_close():
                        max_age = None
                        expires = None
                    else:
                        max_age = request.session.get_expiry_age()
                        expires_time = time.time() + max_age
                        expires = cookie_date(expires_time)
                    # Save the session data and refresh the client cookie.
                    # Skip session save for 500 responses, refs #3881.
                    if response.status_code != 500:
                        try:
                            request.session.save()
                        except UpdateError:
                            raise SuspiciousOperation(
                                "The request's session was deleted before the "
                                "request completed. The user may have logged "
                                "out in a concurrent request, for example."
                            )
                        response.set_cookie(
                            settings.SESSION_COOKIE_NAME,
                            request.session.session_key, max_age=max_age,
                            expires=expires, domain=_get_current_domain(request),
                            path=settings.SESSION_COOKIE_PATH,
                            secure=settings.SESSION_COOKIE_SECURE or None,
                            httponly=settings.SESSION_COOKIE_HTTPONLY or None,
                            samesite=settings.SESSION_COOKIE_SAMESITE,
                        )
                        response.cookies[settings.SESSION_COOKIE_NAME]['samesite'] = 'None'
        return response

def _get_failure_view():
    """
    Returns the view to be used for CSRF rejections
    """
    return get_callable(settings.CSRF_FAILURE_VIEW)


def _get_new_csrf_string():
    return get_random_string(CSRF_SECRET_LENGTH, allowed_chars=CSRF_ALLOWED_CHARS)

def _salt_cipher_secret(secret):
    """
    Given a secret (assumed to be a string of CSRF_ALLOWED_CHARS), generate a
    token by adding a salt and using it to encrypt the secret.
    """
    salt = _get_new_csrf_string()
    chars = CSRF_ALLOWED_CHARS
    pairs = zip((chars.index(x) for x in secret), (chars.index(x) for x in salt))
    cipher = ''.join(chars[(x + y) % len(chars)] for x, y in pairs)
    return salt + cipher


def _unsalt_cipher_token(token):
    """
    Given a token (assumed to be a string of CSRF_ALLOWED_CHARS, of length
    CSRF_TOKEN_LENGTH, and that its first half is a salt), use it to decrypt
    the second half to produce the original secret.
    """
    salt = token[:CSRF_SECRET_LENGTH]
    token = token[CSRF_SECRET_LENGTH:]
    chars = CSRF_ALLOWED_CHARS
    pairs = zip((chars.index(x) for x in token), (chars.index(x) for x in salt))
    secret = ''.join(chars[x - y] for x, y in pairs)  # Note negative values are ok
    return secret

def _get_new_csrf_token():
    return _salt_cipher_secret(_get_new_csrf_string())

def get_token(request):
    """
    Return the CSRF token required for a POST form. The token is an
    alphanumeric value. A new token is created if one is not already set.
    A side effect of calling this function is to make the csrf_protect
    decorator and the CsrfViewMiddleware add a CSRF cookie and a 'Vary: Cookie'
    header to the outgoing response.  For this reason, you may need to use this
    function lazily, as is done by the csrf context processor.
    """
    if "CSRF_COOKIE" not in request.META:
        csrf_secret = _get_new_csrf_string()
        request.META["CSRF_COOKIE"] = _salt_cipher_secret(csrf_secret)
    else:
        csrf_secret = _unsalt_cipher_token(request.META["CSRF_COOKIE"])
    request.META["CSRF_COOKIE_USED"] = True
    return _salt_cipher_secret(csrf_secret)


def rotate_token(request):
    """
    Changes the CSRF token in use for a request - should be done on login
    for security purposes.
    """
    request.META.update({
        "CSRF_COOKIE_USED": True,
        "CSRF_COOKIE": _get_new_csrf_token(),
    })
    request.csrf_cookie_needs_reset = True


def _sanitize_token(token):
    # Allow only ASCII alphanumerics
    if re.search('[^a-zA-Z0-9]', token):
        return _get_new_csrf_token()
    elif len(token) == CSRF_TOKEN_LENGTH:
        return token
    elif len(token) == CSRF_SECRET_LENGTH:
        # Older Django versions set cookies to values of CSRF_SECRET_LENGTH
        # alphanumeric characters. For backwards compatibility, accept
        # such values as unsalted secrets.
        # It's easier to salt here and be consistent later, rather than add
        # different code paths in the checks, although that might be a tad more
        # efficient.
        return _salt_cipher_secret(token)
    return _get_new_csrf_token()

def _compare_salted_tokens(request_csrf_token, csrf_token):
    # Assume both arguments are sanitized -- that is, strings of
    # length CSRF_TOKEN_LENGTH, all CSRF_ALLOWED_CHARS.
    return constant_time_compare(
        _unsalt_cipher_token(request_csrf_token),
        _unsalt_cipher_token(csrf_token),
    )

class OCCsrfViewMiddleware(CsrfViewMiddleware):
    """
    Require a present and correct csrfmiddlewaretoken for POST requests that
    have a CSRF cookie, and set an outgoing CSRF cookie.
    This middleware should be used in conjunction with the {% csrf_token %}
    template tag.
    """
    # The _accept and _reject methods currently only exist for the sake of the
    # requires_csrf_token decorator.
    def _accept(self, request):
        # Avoid checking the request twice by adding a custom attribute to
        # request.  This will be relevant when both decorator and middleware
        # are used.
        request.csrf_processing_done = True
        return None

    def _reject(self, request, reason):
        response = _get_failure_view()(request, reason=reason)
        log_response(
            'Forbidden (%s): %s', reason, request.path,
            response=response,
            request=request,
            logger=logger,
        )
        return response

    def _get_token(self, request):
        if settings.CSRF_USE_SESSIONS:
            try:
                return request.session.get(CSRF_SESSION_KEY)
            except AttributeError:
                raise ImproperlyConfigured(
                    'CSRF_USE_SESSIONS is enabled, but request.session is not '
                    'set. SessionMiddleware must appear before CsrfViewMiddleware '
                    'in MIDDLEWARE%s.' % ('_CLASSES' if settings.MIDDLEWARE is None else '')
                )
        else:
            try:
                cookie_token = request.COOKIES[settings.CSRF_COOKIE_NAME]
            except KeyError:
                return None

            csrf_token = _sanitize_token(cookie_token)
            if csrf_token != cookie_token:
                # Cookie token needed to be replaced;
                # the cookie needs to be reset.
                request.csrf_cookie_needs_reset = True
            return csrf_token

    def _set_token(self, request, response):
        if settings.CSRF_USE_SESSIONS:
            if request.session.get(CSRF_SESSION_KEY) != request.META['CSRF_COOKIE']:
                request.session[CSRF_SESSION_KEY] = request.META['CSRF_COOKIE']
        else:
            response.set_cookie(
                settings.CSRF_COOKIE_NAME,
                request.META['CSRF_COOKIE'],
                max_age=settings.CSRF_COOKIE_AGE,
                domain=_get_current_domain(request),
                path=settings.CSRF_COOKIE_PATH,
                secure=settings.CSRF_COOKIE_SECURE,
                httponly=settings.CSRF_COOKIE_HTTPONLY,
                samesite=settings.CSRF_COOKIE_SAMESITE,
            )
            # response.cookies[settings.CSRF_COOKIE_NAME]['samesite'] = 'None'
            # Set the Vary header since content varies with the CSRF cookie.
            patch_vary_headers(response, ('Cookie',))

    def process_request(self, request):
        csrf_token = self._get_token(request)
        if csrf_token is not None:
            # Use same token next time.
            request.META['CSRF_COOKIE'] = csrf_token

    def process_view(self, request, callback, callback_args, callback_kwargs):
        if getattr(request, 'csrf_processing_done', False):
            return None

        # Wait until request.META["CSRF_COOKIE"] has been manipulated before
        # bailing out, so that get_token still works
        if getattr(callback, 'csrf_exempt', False):
            return None

        # Assume that anything not defined as 'safe' by RFC7231 needs protection
        if request.method not in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            if getattr(request, '_dont_enforce_csrf_checks', False):
                # Mechanism to turn off CSRF checks for test suite.
                # It comes after the creation of CSRF cookies, so that
                # everything else continues to work exactly the same
                # (e.g. cookies are sent, etc.), but before any
                # branches that call reject().
                return self._accept(request)

            if request.is_secure():
                # Suppose user visits http://example.com/
                # An active network attacker (man-in-the-middle, MITM) sends a
                # POST form that targets https://example.com/detonate-bomb/ and
                # submits it via JavaScript.
                #
                # The attacker will need to provide a CSRF cookie and token, but
                # that's no problem for a MITM and the session-independent
                # secret we're using. So the MITM can circumvent the CSRF
                # protection. This is true for any HTTP connection, but anyone
                # using HTTPS expects better! For this reason, for
                # https://example.com/ we need additional protection that treats
                # http://example.com/ as completely untrusted. Under HTTPS,
                # Barth et al. found that the Referer header is missing for
                # same-domain requests in only about 0.2% of cases or less, so
                # we can use strict Referer checking.
                referer = request.META.get('HTTP_REFERER')
                if referer is None:
                    return self._reject(request, REASON_NO_REFERER)

                referer = urlparse(referer)

                # Make sure we have a valid URL for Referer.
                if '' in (referer.scheme, referer.netloc):
                    return self._reject(request, REASON_MALFORMED_REFERER)

                # Ensure that our Referer is also secure.
                if referer.scheme != 'https':
                    return self._reject(request, REASON_INSECURE_REFERER)

                # If there isn't a CSRF_COOKIE_DOMAIN, require an exact match
                # match on host:port. If not, obey the cookie rules (or those
                # for the session cookie, if CSRF_USE_SESSIONS).
                good_referer = (
                    settings.SESSION_COOKIE_DOMAIN
                    if settings.CSRF_USE_SESSIONS
                    else settings.CSRF_COOKIE_DOMAIN
                )
                if good_referer is not None:
                    server_port = request.get_port()
                    if server_port not in ('443', '80'):
                        good_referer = '%s:%s' % (good_referer, server_port)
                else:
                    try:
                        # request.get_host() includes the port.
                        good_referer = request.get_host()
                    except DisallowedHost:
                        pass

                # Create a list of all acceptable HTTP referers, including the
                # current host if it's permitted by ALLOWED_HOSTS.
                good_hosts = list(settings.CSRF_TRUSTED_ORIGINS)
                if good_referer is not None:
                    good_hosts.append(good_referer)

                if not any(is_same_domain(referer.netloc, host) for host in good_hosts):
                    reason = REASON_BAD_REFERER % referer.geturl()
                    return self._reject(request, reason)

            csrf_token = request.META.get('CSRF_COOKIE')
            if csrf_token is None:
                # No CSRF cookie. For POST requests, we insist on a CSRF cookie,
                # and in this way we can avoid all CSRF attacks, including login
                # CSRF.
                return self._reject(request, REASON_NO_CSRF_COOKIE)

            # Check non-cookie token for match.
            request_csrf_token = ""
            if request.method == "POST":
                try:
                    request_csrf_token = request.POST.get('csrfmiddlewaretoken', '')
                except IOError:
                    # Handle a broken connection before we've completed reading
                    # the POST data. process_view shouldn't raise any
                    # exceptions, so we'll ignore and serve the user a 403
                    # (assuming they're still listening, which they probably
                    # aren't because of the error).
                    pass

            if request_csrf_token == "":
                # Fall back to X-CSRFToken, to make things easier for AJAX,
                # and possible for PUT/DELETE.
                request_csrf_token = request.META.get(settings.CSRF_HEADER_NAME, '')

            request_csrf_token = _sanitize_token(request_csrf_token)
            if not _compare_salted_tokens(request_csrf_token, csrf_token):
                return self._reject(request, REASON_BAD_TOKEN)

        return self._accept(request)
    
    def process_response(self, request, response):
        if not getattr(request, 'csrf_cookie_needs_reset', False):
            if getattr(response, 'csrf_cookie_set', False):
                return response

        if not request.META.get("CSRF_COOKIE_USED", False):
            return response

        # Set the CSRF cookie even if it's already set, so we renew
        # the expiry timer.
        self._set_token(request, response)
        response.csrf_cookie_set = True
