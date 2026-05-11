import os
from datetime import datetime

from flask import jsonify, request, send_file, send_from_directory
from werkzeug.utils import secure_filename

from config import BASE_DIR
from .services.export_service import export_inspections_to_excel
from .services.inspection_service import (
    delete_inspection_record,
    fetch_inspection_history,
    save_inspection_record,
)
from .services.project_service import create_project, delete_project, list_projects, rename_project

STATIC_DIR = os.path.join(BASE_DIR, "static")


def register_routes(app):
    @app.route("/")
    def serve_index():
        return send_from_directory(STATIC_DIR, "index.html")

    @app.route("/uploads/<filename>")
    def serve_upload(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], secure_filename(filename))

    @app.route("/api/projects", methods=["GET"])
    def get_projects():
        try:
            result, status_code = list_projects()
            return jsonify(result), status_code
        except Exception as error:
            return jsonify({"success": False, "message": str(error)}), 500

    @app.route("/api/projects", methods=["POST"])
    def add_project():
        try:
            payload = request.get_json(silent=True) or {}
            result, status_code = create_project(payload.get("name", ""))
            return jsonify(result), status_code
        except Exception as error:
            return jsonify({"success": False, "message": str(error)}), 500

    @app.route("/api/projects/<project_id>", methods=["DELETE"])
    def remove_project(project_id):
        try:
            result, status_code = delete_project(project_id)
            return jsonify(result), status_code
        except Exception as error:
            return jsonify({"success": False, "message": str(error)}), 500

    @app.route("/api/projects/<project_id>", methods=["PUT"])
    def update_project(project_id):
        try:
            payload = request.get_json(silent=True) or {}
            result, status_code = rename_project(project_id, payload.get("name", ""))
            return jsonify(result), status_code
        except Exception as error:
            return jsonify({"success": False, "message": str(error)}), 500

    @app.route("/api/save-inspection", methods=["POST"])
    def save_inspection():
        try:
            result, status_code = save_inspection_record(
                form=request.form,
                files=request.files.getlist("images"),
                upload_folder=app.config["UPLOAD_FOLDER"],
            )
            return jsonify(result), status_code
        except Exception as error:
            return jsonify({"success": False, "message": str(error)}), 500

    @app.route("/api/get-history", methods=["GET"])
    def get_history():
        try:
            inspections = fetch_inspection_history(
                machine_filter=request.args.get("machine", ""),
                severity_filter=request.args.get("severity", ""),
                sort_order=request.args.get("sort", "latest"),
                project_id=request.args.get("project_id", ""),
            )
            return jsonify({"success": True, "data": [item.to_dict() for item in inspections]}), 200
        except Exception as error:
            return jsonify({"success": False, "message": str(error)}), 500

    @app.route("/api/delete/<inspection_id>", methods=["DELETE"])
    def delete_inspection(inspection_id):
        try:
            result, status_code = delete_inspection_record(
                inspection_id=inspection_id,
                upload_folder=app.config["UPLOAD_FOLDER"],
                project_id=request.args.get("project_id", ""),
            )
            return jsonify(result), status_code
        except Exception as error:
            return jsonify({"success": False, "message": str(error)}), 500

    @app.route("/api/export-excel", methods=["GET"])
    def export_excel():
        try:
            excel_io = export_inspections_to_excel(
                machine_filter=request.args.get("machine", ""),
                severity_filter=request.args.get("severity", ""),
                sort_order=request.args.get("sort", "latest"),
                upload_folder=app.config["UPLOAD_FOLDER"],
                project_id=request.args.get("project_id", ""),
            )
            return send_file(
                excel_io,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name=f'Machine_Inspection_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx',
            )
        except Exception as error:
            print(f"Error exporting Excel: {error}")
            return jsonify({"success": False, "message": str(error)}), 500

    @app.route("/<path:filename>")
    def serve_static(filename):
        return send_from_directory(STATIC_DIR, filename)
