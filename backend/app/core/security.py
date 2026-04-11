from insforge import InsforgeClient
from app.core.config import settings


insforge = InsforgeClient(settings.INSFORGE_URL, settings.INSFORGE_API_KEY)


async def validate_insforge_token(token: str):
    """
    Validates the token with InsForge and returns the session info.
    """
    try:
        session = await insforge.auth.get_current_session(access_token=token)
        return session
    except Exception:
        return None
