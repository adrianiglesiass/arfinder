import asyncio
import logging
import re
import uuid
import cloudinary
import cloudinary.uploader
from app.core.config import settings

logger = logging.getLogger(__name__)

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

_UPLOAD_FOLDER = "arfinder/profiles"
_VERSION_SEGMENT = re.compile(r"^v\d+$")


async def upload_image(file, user_id: int) -> str:

    folder = _UPLOAD_FOLDER
    public_id = f"{user_id}/{uuid.uuid4()}"

    result = await asyncio.to_thread(
        cloudinary.uploader.upload,
        file,
        folder=folder,
        public_id=public_id,
        resource_type="image",
    )

    return result["secure_url"]


def extract_public_id_from_url(photo_url: str) -> str | None:
    """Devuelve el public_id de Cloudinary a partir de un secure_url."""
    if not photo_url or "/upload/" not in photo_url:
        return None

    path = photo_url.split("/upload/", 1)[1]
    parts = path.split("/")
    if parts and _VERSION_SEGMENT.match(parts[0]):
        parts = parts[1:]
    if not parts:
        return None
    return "/".join(parts)


def delete_image(photo_url: str) -> None:
    """Best-effort: destruye el asset remoto sin romper el borrado local."""
    public_id = extract_public_id_from_url(photo_url)
    if not public_id:
        logger.warning("cannot delete cloudinary image, bad url: %s", photo_url)
        return
    candidates = [public_id]
    stripped = public_id.rsplit(".", 1)[0] if "." in public_id else None
    if stripped and stripped != public_id:
        candidates.append(stripped)
    for candidate in candidates:
        try:
            if cloudinary.uploader.destroy(candidate).get("result") == "ok":
                return
        except Exception:
            logger.exception("cloudinary destroy failed for public_id=%s", candidate)
    logger.warning("cloudinary image not destroyed: %s", public_id)
