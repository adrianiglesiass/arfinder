import uuid
from insforge import InsforgeClient
from app.core.config import settings

insforge = InsforgeClient(settings.INSFORGE_URL, settings.INSFORGE_API_KEY)


async def upload_image(file, user_id: int) -> str:
    path = f"profiles/{user_id}/{uuid.uuid4()}.jpg"
    bucket = "photos"

    if hasattr(file, "read"):
        file_bytes = file.read()
    else:
        file_bytes = file

    await insforge.storage.upload_object(bucket, path, file_bytes)

    # Construct public URL
    return f"{settings.OSS_HOST}/api/storage/buckets/{bucket}/objects/{path}"
