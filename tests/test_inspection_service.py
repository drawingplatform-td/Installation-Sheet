import json
import os

from database import Inspection, db
from inspection_app.services.inspection_service import (
    delete_inspection_record,
    fetch_inspection_history,
    save_inspection_record,
)
from inspection_app.utils.inspection_utils import SEVERITY_RANK_MAP, parse_image_links


SEVERITY_BY_RANK = {rank: value for value, rank in SEVERITY_RANK_MAP.items()}
HIGH = SEVERITY_BY_RANK[3]
LOW = SEVERITY_BY_RANK[1]


def test_save_inspection_requires_machine(app, upload_folder):
    with app.app_context():
        result, status = save_inspection_record({"machine": "   "}, [], str(upload_folder))

    assert status == 400
    assert result["success"] is False


def test_create_fetch_update_and_delete_inspection_with_images(app, upload_folder, image_file_factory):
    with app.app_context():
        result, status = save_inspection_record(
            {
                "machine": "Pump A",
                "issue": "Leak",
                "severity": HIGH,
                "remark": "Initial note",
            },
            [image_file_factory("old-one.png"), image_file_factory("old-two.png", color=(180, 40, 40))],
            str(upload_folder),
        )

        assert status == 201
        inspection_id = result["id"]
        inspection = db.session.get(Inspection, inspection_id)
        original_links = parse_image_links(inspection.image_links)
        assert len(original_links) == 2
        assert all(os.path.exists(os.path.join(upload_folder, link.split("/")[-1])) for link in original_links)

        update_result, update_status = save_inspection_record(
            {
                "inspection_id": inspection_id,
                "machine": "Pump A Updated",
                "issue": "Leak fixed",
                "severity": LOW,
                "remark": "Updated note",
                "existingUrl": json.dumps(original_links),
                "removed_images": json.dumps([original_links[1]]),
            },
            [image_file_factory("new-one.png", color=(40, 180, 40))],
            str(upload_folder),
        )

        assert update_status == 201
        assert update_result["success"] is True
        db.session.refresh(inspection)
        updated_links = parse_image_links(inspection.image_links)
        assert len(updated_links) == 2
        assert original_links[0] in updated_links
        assert original_links[1] not in updated_links
        assert not os.path.exists(os.path.join(upload_folder, original_links[1].split("/")[-1]))

        fetched = fetch_inspection_history(machine_filter="pump a updated")
        assert [item.id for item in fetched] == [inspection_id]

        delete_result, delete_status = delete_inspection_record(inspection_id, str(upload_folder))
        assert delete_status == 200
        assert delete_result["success"] is True
        assert db.session.get(Inspection, inspection_id) is None
        assert all(not os.path.exists(os.path.join(upload_folder, link.split("/")[-1])) for link in updated_links)


def test_delete_missing_record_returns_404(app, upload_folder):
    with app.app_context():
        result, status = delete_inspection_record("missing-id", str(upload_folder))

    assert status == 404
    assert result["success"] is False
