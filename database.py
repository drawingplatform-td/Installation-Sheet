from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone
import uuid
from sqlalchemy import inspect, text

db = SQLAlchemy()
LOCAL_TIMEZONE = datetime.now().astimezone().tzinfo
DEFAULT_PROJECT_NAME = "Default Project"

def to_local_time(value):
    if not value:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)

    return value.astimezone(LOCAL_TIMEZONE)


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(255), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        local_created_at = to_local_time(self.created_at)
        return {
            'id': self.id,
            'name': self.name,
            'created_at': local_created_at.isoformat() if local_created_at else None,
        }


class Inspection(db.Model):
    __tablename__ = 'inspections'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), index=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    machine = db.Column(db.String(255), nullable=False)
    image_links = db.Column(db.Text)  # JSON array of image paths
    issue = db.Column(db.String(500))
    severity = db.Column(db.String(20))
    remark = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        local_timestamp = to_local_time(self.timestamp)
        local_created_at = to_local_time(self.created_at)
        return {
            'id': self.id,
            'project_id': self.project_id,
            'timestamp': local_timestamp.isoformat() if local_timestamp else None,
            'machine': self.machine,
            'image_links': self.image_links,
            'issue': self.issue,
            'severity': self.severity,
            'remark': self.remark,
            'created_at': local_created_at.isoformat() if local_created_at else None
        }

def init_db(app):
    with app.app_context():
        db.create_all()
        default_project = Project.query.filter(Project.name == DEFAULT_PROJECT_NAME).first()
        if not default_project:
            default_project = Project(name=DEFAULT_PROJECT_NAME)
            db.session.add(default_project)
            db.session.commit()

        inspector = inspect(db.engine)
        columns = {column["name"] for column in inspector.get_columns("inspections")}
        if "severity" not in columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE inspections ADD COLUMN severity VARCHAR(20)"))
        if "project_id" not in columns:
            with db.engine.begin() as connection:
                connection.execute(text("ALTER TABLE inspections ADD COLUMN project_id VARCHAR(36)"))
        with db.engine.begin() as connection:
            connection.execute(
                text("UPDATE inspections SET project_id = :project_id WHERE project_id IS NULL OR project_id = ''"),
                {"project_id": default_project.id},
            )
