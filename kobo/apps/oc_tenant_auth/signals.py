from allauth.account.signals import user_logged_in
from django.dispatch import receiver

from .adapter import sync_login_state


@receiver(user_logged_in, dispatch_uid='oc_tenant_auth.sync_login_state')
def refresh_login_state(sender, request, user, sociallogin=None, **kwargs):
    """
    Runs on every login, unlike save_user() (signup only, OC-28410).
    Skips non-social logins, which have no sociallogin in signal_kwargs.
    """
    if sociallogin is None:
        return
    sync_login_state(request, user, sociallogin)
