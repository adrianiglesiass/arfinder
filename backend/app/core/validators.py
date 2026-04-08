import re


def validate_password_strength(value: str) -> str:
    missing = []

    if len(value) < 8:
        missing.append("al menos 8 caracteres")
    if not re.search(r"[A-Z]", value):
        missing.append("una mayúscula")
    if not re.search(r"[a-z]", value):
        missing.append("una minúscula")
    if not re.search(r"\d", value):
        missing.append("un número")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", value):
        missing.append("un carácter especial")

    if missing:
        raise ValueError(f"La contraseña debe tener: {', '.join(missing)}.")

    return value
