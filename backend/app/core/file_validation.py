from fastapi import HTTPException, status

IMAGE_MAGIC_BYTES = {
    "jpeg": [b"\xff\xd8\xff"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "gif": [b"GIF87a", b"GIF89a"],
    "webp": [b"RIFF"],
    "heic": [b"ftypheic", b"ftypmif1", b"ftypmsf1", b"ftyphevc"],
}


def validate_image_header(file_content: bytes):

    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="El archivo está vacío."
        )

    for format_name, signatures in IMAGE_MAGIC_BYTES.items():
        for signature in signatures:
            if file_content.startswith(signature):
                if format_name == "webp":
                    if len(file_content) > 12 and file_content[8:12] == b"WEBP":
                        return format_name
                    continue
                return format_name

            if format_name == "heic":
                if len(file_content) > 12 and signature in file_content[4:12]:
                    return format_name

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Formato de archivo no válido. Solo se permiten imágenes reales (JPG, PNG, WEBP, GIF, HEIC).",
    )
