import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


def upload_image(file) -> str:
    result = cloudinary.uploader.upload(
        file, folder="arfinder/profiles", resource_type="image"
    )
    return result["secure_url"]
