from app.core.constants import CURRENT_TERMS_VERSION
from app.models.user import User


def has_accepted_current_terms(user: User) -> bool:
    return (
        user.terms_accepted_at is not None
        and user.terms_version == CURRENT_TERMS_VERSION
    )
