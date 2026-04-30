from io import BytesIO

from openpyxl import load_workbook

from database import Inspection, db


def test_index_route_serves_html(client):
    response = client.get("/")

    assert response.status_code == 200
    assert b"Machine Inspection" in response.data


def test_save_get_delete_history_routes(client, app, image_bytes_factory):
    response = client.post(
        "/api/save-inspection",
        data={
            "machine": "Route Machine",
            "issue": "Route issue",
            "remark": "Route note",
            "images": (image_bytes_factory(), "route.png"),
        },
        content_type="multipart/form-data",
    )
    payload = response.get_json()

    assert response.status_code == 201
    assert payload["success"] is True
    inspection_id = payload["id"]

    history_response = client.get("/api/get-history?machine=route%20machine")
    history_payload = history_response.get_json()
    assert history_response.status_code == 200
    assert [item["id"] for item in history_payload["data"]] == [inspection_id]

    delete_response = client.delete(f"/api/delete/{inspection_id}")
    assert delete_response.status_code == 200
    assert delete_response.get_json()["success"] is True
    with app.app_context():
        assert db.session.get(Inspection, inspection_id) is None


def test_export_excel_route_returns_workbook(client):
    client.post(
        "/api/save-inspection",
        data={
            "machine": "Export Route Machine",
            "issue": "Export route issue",
        },
        content_type="multipart/form-data",
    )

    response = client.get("/api/export-excel")

    assert response.status_code == 200
    assert response.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    workbook = load_workbook(BytesIO(response.data))
    assert workbook.active.title == "Inspection History"
