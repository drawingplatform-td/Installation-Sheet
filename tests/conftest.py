from io import BytesIO

import pytest
from PIL import Image
from werkzeug.datastructures import FileStorage

import inspection_app
from database import db


@pytest.fixture
def upload_folder(tmp_path):
    folder = tmp_path / "uploads"
    folder.mkdir()
    return folder


@pytest.fixture
def app(tmp_path, upload_folder, monkeypatch):
    db_path = tmp_path / "inspection_test.db"
    monkeypatch.setattr(inspection_app, "DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setattr(inspection_app, "UPLOAD_FOLDER", str(upload_folder))
    monkeypatch.setattr(inspection_app, "MAX_CONTENT_LENGTH", 10 * 1024 * 1024)

    app = inspection_app.create_app()
    app.config.update(TESTING=True)

    yield app

    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def image_file_factory():
    def make_image_file(filename="issue.png", color=(32, 96, 160), image_format="PNG"):
        stream = BytesIO()
        Image.new("RGB", (80, 60), color).save(stream, format=image_format)
        stream.seek(0)
        return FileStorage(stream=stream, filename=filename, content_type=f"image/{image_format.lower()}")

    return make_image_file


@pytest.fixture
def image_bytes_factory():
    def make_image_bytes(color=(32, 96, 160), image_format="PNG"):
        stream = BytesIO()
        Image.new("RGB", (80, 60), color).save(stream, format=image_format)
        stream.seek(0)
        return stream

    return make_image_bytes
