"""
User model and role definitions.
MVP: read from env (AUTHORIZED_INSURERS) for single-user deployment.
"""
import os


def get_current_user_insurers() -> list[str] | None:
    """
    Return list of insurers the current user can view.
    None = all insurers (no restriction).
    Reads from AUTHORIZED_INSURERS env (comma-separated).
    """
    val = os.getenv("AUTHORIZED_INSURERS")
    if not val or not val.strip():
        return None
    return [i.strip() for i in val.split(",") if i.strip()]
