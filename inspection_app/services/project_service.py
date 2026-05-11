from sqlalchemy import func

from database import DEFAULT_PROJECT_NAME, Inspection, Project, db


def get_default_project():
    project = Project.query.filter(Project.name == DEFAULT_PROJECT_NAME).first()
    if project:
        return project

    project = Project(name=DEFAULT_PROJECT_NAME)
    db.session.add(project)
    db.session.commit()
    return project


def resolve_project(project_id=""):
    project_id = (project_id or "").strip()
    if project_id:
        return db.session.get(Project, project_id)
    return get_default_project()


def list_projects():
    projects = Project.query.order_by(func.lower(Project.name).asc()).all()
    if not projects:
        projects = [get_default_project()]
    default_project = get_default_project()
    return {
        "success": True,
        "data": [project.to_dict() for project in projects],
        "current_project_id": default_project.id,
    }, 200


def create_project(name):
    name = (name or "").strip()
    if not name:
        return {"success": False, "message": "Project name is required"}, 400

    existing = Project.query.filter(func.lower(Project.name) == name.lower()).first()
    if existing:
        return {"success": False, "message": "Project name already exists"}, 409

    project = Project(name=name)
    db.session.add(project)
    db.session.commit()
    return {"success": True, "message": "Project created", "project": project.to_dict()}, 201


def rename_project(project_id, name):
    project = db.session.get(Project, (project_id or "").strip())
    if not project:
        return {"success": False, "message": "Project not found"}, 404

    name = (name or "").strip()
    if not name:
        return {"success": False, "message": "Project name is required"}, 400

    existing = Project.query.filter(func.lower(Project.name) == name.lower(), Project.id != project.id).first()
    if existing:
        return {"success": False, "message": "Project name already exists"}, 409

    project.name = name
    db.session.commit()
    return {"success": True, "message": "Project renamed", "project": project.to_dict()}, 200


def delete_project(project_id):
    project = db.session.get(Project, (project_id or "").strip())
    if not project:
        return {"success": False, "message": "Project not found"}, 404

    if Project.query.count() <= 1:
        return {"success": False, "message": "Cannot delete the last project"}, 400

    record_count = Inspection.query.filter(Inspection.project_id == project.id).count()
    if record_count > 0:
        return {"success": False, "message": "Cannot delete a project that still has records"}, 400

    db.session.delete(project)
    db.session.commit()
    return {"success": True, "message": "Project deleted"}, 200
