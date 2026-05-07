import asyncio
import uuid
import cloudinary
import cloudinary.uploader
from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)


async def upload_image(file, user_id: int) -> str:

    folder = "arfinder/profiles"
    public_id = f"{user_id}/{uuid.uuid4()}"

    result = await asyncio.to_thread(
        cloudinary.uploader.upload,
        file,
        folder=folder,
        public_id=public_id,
        resource_type="image",
    )

    return result["secure_url"]
