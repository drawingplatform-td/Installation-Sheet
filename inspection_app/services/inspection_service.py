import json

from database import Inspection, db

from ..utils.image_utils import delete_image_file, save_uploaded_image
from ..utils.inspection_utils import build_inspection_query, parse_image_links


def _build_uploaded_image_links(files, upload_folder):
    image_links = []
    for file in files:
        if not file or not file.filename:
            continue

        image_path = save_uploaded_image(file, upload_folder)
        if image_path:
            image_links.append(image_path)

    return image_links


def _cleanup_uploaded_files(upload_folder, image_links):
    for image_path in image_links or []:
        delete_image_file(upload_folder, image_path)


def _delete_files_after_commit(upload_folder, image_links):
    for image_path in image_links or []:
        try:
            delete_image_file(upload_folder, image_path)
        except OSError as error:
            print(f"Error deleting image after commit {image_path}: {error}")


def save_inspection_record(form, files, upload_folder):
    machine = form.get("machine", "").strip()
    issue = form.get("issue", "").strip()
    severity = form.get("severity", "").strip()
    remark = form.get("remark", "").strip()
    inspection_id = form.get("inspection_id", "").strip()
    existing_image_links = parse_image_links(form.get("existingUrl", ""))
    removed_image_links = parse_image_links(form.get("removed_images", ""))

    if not machine:
        return {"success": False, "message": "กรุณาระบุชื่อเครื่องจักร"}, 400

    uploaded_image_links = []

    try:
        inspection = None
        if inspection_id:
            inspection = Inspection.query.get(inspection_id)
            if not inspection:
                return {"success": False, "message": "ไม่พบรายการที่ต้องการอัปเดต"}, 404

        uploaded_image_links = _build_uploaded_image_links(files, upload_folder)

        if inspection_id:
            current_image_links = parse_image_links(inspection.image_links)
            remaining_existing_links = [
                image_path
                for image_path in existing_image_links
                if image_path in current_image_links and image_path not in removed_image_links
            ]
            final_image_links = remaining_existing_links + uploaded_image_links
            removed_existing_set = set(current_image_links) - set(final_image_links)

            inspection.machine = machine
            inspection.issue = issue
            inspection.severity = severity or None
            inspection.remark = remark
            inspection.image_links = json.dumps(final_image_links) if final_image_links else None

            db.session.commit()
            _delete_files_after_commit(upload_folder, removed_existing_set)
            message = "อัปเดตข้อมูลสำเร็จ"
        else:
            inspection = Inspection(
                machine=machine,
                issue=issue,
                severity=severity or None,
                remark=remark,
                image_links=json.dumps(uploaded_image_links) if uploaded_image_links else None,
            )
            db.session.add(inspection)
            db.session.commit()
            message = "บันทึกข้อมูลสำเร็จ"

        return {"success": True, "message": message, "id": inspection.id}, 201
    except Exception as error:
        db.session.rollback()
        _cleanup_uploaded_files(upload_folder, uploaded_image_links)
        print(f"Error saving inspection: {error}")
        return {"success": False, "message": str(error)}, 500


def fetch_inspection_history(machine_filter="", severity_filter="", sort_order="latest"):
    query = build_inspection_query(
        query=Inspection.query,
        machine_column=Inspection.machine,
        severity_column=Inspection.severity,
        timestamp_column=Inspection.timestamp,
        machine_filter=machine_filter,
        severity_filter=severity_filter,
        sort_order=sort_order,
    )
    return query.all()


def delete_inspection_record(inspection_id, upload_folder):
    try:
        inspection = Inspection.query.get(inspection_id)
        if not inspection:
            return {"success": False, "message": "ไม่พบรายการ"}, 404

        image_links = parse_image_links(inspection.image_links)

        db.session.delete(inspection)
        db.session.commit()
        _delete_files_after_commit(upload_folder, image_links)
        return {"success": True, "message": "ลบข้อมูลสำเร็จ"}, 200
    except Exception as error:
        db.session.rollback()
        return {"success": False, "message": str(error)}, 500
