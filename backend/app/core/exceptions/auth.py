class EmailAlreadyRegisteredError(Exception):
    def __init__(self, email: str = None):
        self.email = email
        message = "Email already registered"
        if email:
            message = f"Email '{email}' is already registered"
        super().__init__(message)


class InvalidCredentialsError(Exception):
    def __init__(self):
        super().__init__("Invalid credentials")
