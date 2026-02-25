"""
Page-level access control.
Filters insurer dropdown options and enforces in callbacks.
"""
from auth.users import get_current_user_insurers


def get_authorized_insurers(all_insurers: list[str]) -> list[str]:
    """
    Filter insurer list to those the current user can view.
    If AUTHORIZED_INSURERS is not set, returns all_insurers.
    """
    allowed = get_current_user_insurers()
    if allowed is None:
        return all_insurers
    return [i for i in all_insurers if i in allowed]
