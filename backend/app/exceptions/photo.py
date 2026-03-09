class PhotoAccessDeniedError(Exception):
    def __init__(self, photo_id: int = None):
        self.photo_id = photo_id
        message = "Not allowed to access this photo"
        if photo_id:
            message = f"Not allowed to access photo {photo_id}"
        super().__init__(message)


class ImageUploadFailedError(Exception):
    def __init__(self, reason: str = None):
        self.reason = reason
        message = "Image upload failed"
        if reason:
            message = f"Image upload failed: {reason}"
        super().__init__(message)
