import os

from inspection_app.utils.image_utils import (
    allowed_file,
    delete_image_file,
    resolve_upload_path,
    save_uploaded_image,
)


def test_allowed_file_accepts_supported_image_extensions():
    assert allowed_file("photo.PNG")
    assert allowed_file("photo.jpeg")
    assert allowed_file("photo.webp")
    assert not allowed_file("photo.txt")
    assert not allowed_file("photo")


def test_save_resolve_and_delete_uploaded_image(upload_folder, image_file_factory):
    image_path = save_uploaded_image(image_file_factory("machine.png"), str(upload_folder))

    assert image_path.startswith("/uploads/")
    resolved_path = resolve_upload_path(str(upload_folder), image_path)
    assert resolved_path
    assert os.path.exists(resolved_path)

    delete_image_file(str(upload_folder), image_path)
    assert not os.path.exists(resolved_path)


def test_save_uploaded_image_rejects_invalid_or_empty_files(upload_folder):
    assert save_uploaded_image(None, str(upload_folder)) is None

    class InvalidFile:
        filename = "not-image.txt"

    assert save_uploaded_image(InvalidFile(), str(upload_folder)) is None
    assert resolve_upload_path(str(upload_folder), "") is None
    assert resolve_upload_path(str(upload_folder), "/uploads/missing.png") is None
