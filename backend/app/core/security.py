from insforge import InsforgeClient
from app.core.config import settings


insforge = InsforgeClient(settings.INSFORGE_URL, settings.INSFORGE_API_KEY)


async def validate_insforge_token(token: str):
    if (
        settings.DEBUG
        and settings.DEV_BYPASS_TOKEN
        and token == settings.DEV_BYPASS_TOKEN
    ):

        class MockUser:
            def __init__(self):
                self.id = "dev-uid-001"
                self.email = "dev@arfinder.com"

        class MockSession:
            def __init__(self):
                self.user = MockUser()

        return MockSession()

    try:
        session = await insforge.auth.get_current_session(access_token=token)
        return session
    except Exception:
        return None
