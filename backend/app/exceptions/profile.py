class ProfileNotFoundError(Exception):
    def __init__(self, user_id: int = None):
        self.user_id = user_id
        message = "Profile not found"
        if user_id:
            message = f"Profile not found for user {user_id}"
        super().__init__(message)


class ProfileAlreadyExistsError(Exception):
    def __init__(self, user_id: int = None):
        self.user_id = user_id
        message = "Profile already exists"
        if user_id:
            message = f"Profile already exists for user {user_id}"
        super().__init__(message)
