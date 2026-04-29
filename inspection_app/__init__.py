from flask import Flask
from flask_cors import CORS

from config import DATABASE_URL, MAX_CONTENT_LENGTH, UPLOAD_FOLDER
from database import db, init_db


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
    app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

    CORS(app)
    db.init_app(app)
    init_db(app)

    from .routes import register_routes

    register_routes(app)
    return app
