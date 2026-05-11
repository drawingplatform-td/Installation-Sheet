from database import DEFAULT_PROJECT_NAME, Inspection, Project, db
from inspection_app.services.inspection_service import save_inspection_record
from inspection_app.services.project_service import (
    create_project,
    delete_project,
    list_projects,
    rename_project,
    resolve_project,
)


def test_default_project_is_created(app):
    with app.app_context():
        project = Project.query.filter(Project.name == DEFAULT_PROJECT_NAME).first()

        assert project is not None
        assert project.name == DEFAULT_PROJECT_NAME


def test_create_list_and_delete_empty_project(app):
    with app.app_context():
        create_result, create_status = create_project("Line A")
        project_id = create_result["project"]["id"]

        assert create_status == 201
        list_result, list_status = list_projects()
        assert list_status == 200
        assert "current_project_id" in list_result
        assert "Line A" in [project["name"] for project in list_result["data"]]

        delete_result, delete_status = delete_project(project_id)
        assert delete_status == 200
        assert delete_result["success"] is True
        assert db.session.get(Project, project_id) is None


def test_project_name_validation_and_duplicate_rejection(app):
    with app.app_context():
        result, status = create_project("   ")
        assert status == 400
        assert result["success"] is False

        assert create_project("Line A")[1] == 201
        duplicate_result, duplicate_status = create_project("line a")
        assert duplicate_status == 409
        assert duplicate_result["success"] is False


def test_rename_project_success_and_duplicate_rejection(app):
    with app.app_context():
        first_result, _ = create_project("Line A")
        first_project_id = first_result["project"]["id"]
        create_project("Line B")

        rename_result, rename_status = rename_project(first_project_id, "Line A Updated")
        assert rename_status == 200
        assert rename_result["project"]["name"] == "Line A Updated"
        assert db.session.get(Project, first_project_id).name == "Line A Updated"

        duplicate_result, duplicate_status = rename_project(first_project_id, "line b")
        assert duplicate_status == 409
        assert duplicate_result["success"] is False
        assert db.session.get(Project, first_project_id).name == "Line A Updated"


def test_rename_project_validation_and_missing_project(app):
    with app.app_context():
        project_result, _ = create_project("Rename Target")
        project_id = project_result["project"]["id"]

        empty_result, empty_status = rename_project(project_id, "   ")
        assert empty_status == 400
        assert empty_result["success"] is False

        missing_result, missing_status = rename_project("missing-project-id", "New Name")
        assert missing_status == 404
        assert missing_result["success"] is False


def test_delete_project_with_records_is_blocked(app, upload_folder):
    with app.app_context():
        create_result, _ = create_project("Line B")
        project_id = create_result["project"]["id"]

        save_inspection_record(
            {
                "project_id": project_id,
                "machine": "Machine B",
                "issue": "Issue",
            },
            [],
            str(upload_folder),
        )

        delete_result, delete_status = delete_project(project_id)
        assert delete_status == 400
        assert delete_result["success"] is False
        assert Inspection.query.filter(Inspection.project_id == project_id).count() == 1


def test_delete_last_project_is_blocked(app):
    with app.app_context():
        default_project = resolve_project()

        delete_result, delete_status = delete_project(default_project.id)

        assert delete_status == 400
        assert delete_result["success"] is False
        assert "last project" in delete_result["message"]
        assert db.session.get(Project, default_project.id) is not None


def test_delete_missing_project_returns_404(app):
    with app.app_context():
        delete_result, delete_status = delete_project("missing-project-id")

        assert delete_status == 404
        assert delete_result["success"] is False
