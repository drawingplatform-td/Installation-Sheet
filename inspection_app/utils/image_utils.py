import os
import uuid

from PIL import Image, ImageOps
from werkzeug.utils import secure_filename


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "bmp"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def delete_image_file(upload_folder, image_path):
    if not image_path:
        return

    filename = secure_filename(str(image_path).split("/")[-1])
    if not filename:
        return

    filepath = os.path.join(upload_folder, filename)
    if os.path.exists(filepath):
        os.remove(filepath)


def resolve_upload_path(upload_folder, image_path):
    if not image_path:
        return None

    filename = secure_filename(str(image_path).split("/")[-1])
    if not filename:
        return None

    filepath = os.path.join(upload_folder, filename)
    return filepath if os.path.exists(filepath) else None


def save_uploaded_image(file, upload_folder):
    if not file or file.filename == "":
        return None

    if not allowed_file(file.filename):
        return None

    filepath = None

    try:
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(upload_folder, unique_filename)

        file.save(filepath)

        with Image.open(filepath) as opened_image:
            image = ImageOps.exif_transpose(opened_image)
            image.thumbnail((2560, 2560), Image.Resampling.LANCZOS)
            save_kwargs = {"optimize": True}

            if image.mode in ("RGBA", "LA"):
                image.save(filepath, **save_kwargs)
            else:
                if image.mode not in ("RGB", "L"):
                    image = image.convert("RGB")
                image.save(filepath, quality=92, **save_kwargs)

        return f"/uploads/{unique_filename}"
    except Exception as error:
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass
        print(f"Error saving image: {error}")
        return None
