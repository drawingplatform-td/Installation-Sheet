import os
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
DATABASE_URL = 'sqlite:///' + os.path.join(BASE_DIR, 'inspection.db')
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB max

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
