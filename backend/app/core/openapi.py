BAD_REQUEST = {400: {"description": "Invalid request body or parameters"}}
CONFLICT = {409: {"description": "Conflict — resource already exists"}}
UNAUTH = {
    400: {"description": "Invalid request body or parameters"},
    401: {"description": "Not authenticated"},
}
NOT_FOUND = {
    400: {"description": "Invalid request body or parameters"},
    404: {"description": "Not found"},
}
PROTECTED = {
    400: {"description": "Invalid request body or parameters"},
    401: {"description": "Not authenticated"},
    404: {"description": "Not found"},
}
SERVICE_UNAVAILABLE = {503: {"description": "External service unavailable"}}
