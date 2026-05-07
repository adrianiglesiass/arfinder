from app.core.exceptions.base import AppError


class ProfileError(AppError):
    pass


class ProfileNotFoundError(ProfileError):
    status_code = 404
    default_detail = "Profile not found"

    def __init__(self, user_id: int = None):
        super().__init__(
            detail=f"Profile not found for user {user_id}"
            if user_id is not None
            else None,
            user_id=user_id,
        )


class ProfileAlreadyExistsError(ProfileError):
    status_code = 400
    default_detail = "Profile already exists"

    def __init__(self, user_id: int = None):
        super().__init__(
            detail=f"Profile already exists for user {user_id}"
            if user_id is not None
            else None,
            user_id=user_id,
        )
