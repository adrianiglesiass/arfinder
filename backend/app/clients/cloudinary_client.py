import cloudinary
import cloudinary.uploader
import os


cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)


def upload_image(file) -> str:
    result = cloudinary.uploader.upload(
        file,
        folder="arfinder/profiles",
        resource_type="image"
    )
    return result["secure_url"]
