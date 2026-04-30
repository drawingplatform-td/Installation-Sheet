from datetime import datetime, timedelta
from types import SimpleNamespace

from inspection_app.utils.inspection_utils import (
    SEVERITY_RANK_MAP,
    filter_and_sort_inspections,
    parse_image_links,
    severity_export_text,
    severity_label_en,
    severity_rank,
)


SEVERITY_BY_RANK = {rank: value for value, rank in SEVERITY_RANK_MAP.items()}
LOW = SEVERITY_BY_RANK[1]
MEDIUM = SEVERITY_BY_RANK[2]
HIGH = SEVERITY_BY_RANK[3]


def make_item(machine, severity, timestamp):
    return SimpleNamespace(machine=machine, severity=severity, timestamp=timestamp)


def test_parse_image_links_accepts_common_formats():
    assert parse_image_links("") == []
    assert parse_image_links(["/uploads/a.png", "", "/uploads/b.png"]) == ["/uploads/a.png", "/uploads/b.png"]
    assert parse_image_links('["/uploads/a.png", "", "/uploads/b.png"]') == ["/uploads/a.png", "/uploads/b.png"]
    assert parse_image_links("/uploads/a.png\n\n/uploads/b.png") == ["/uploads/a.png", "/uploads/b.png"]


def test_severity_helpers_map_known_and_unknown_values():
    assert severity_rank(LOW) == 1
    assert severity_rank(MEDIUM) == 2
    assert severity_rank(HIGH) == 3
    assert severity_rank("unknown") == 0
    assert severity_label_en(HIGH) == "High"
    assert severity_label_en("") == "-"
    assert "Urgent" in severity_export_text(HIGH)
    assert severity_export_text("custom") == "custom"


def test_filter_and_sort_latest_machine_and_severity_orders():
    base = datetime(2026, 1, 1, 9, 0, 0)
    items = [
        make_item("Beta", LOW, base),
        make_item("alpha", HIGH, base + timedelta(minutes=1)),
        make_item("Alpha", MEDIUM, base + timedelta(minutes=2)),
        make_item("Beta", HIGH, base + timedelta(minutes=3)),
    ]

    assert [item.machine for item in filter_and_sort_inspections(items, sort_order="latest")] == [
        "Beta",
        "Alpha",
        "alpha",
        "Beta",
    ]
    assert [item.severity for item in filter_and_sort_inspections(items, sort_order="severity-desc")] == [
        HIGH,
        HIGH,
        MEDIUM,
        LOW,
    ]
    assert [item.machine for item in filter_and_sort_inspections(items, sort_order="machine-asc")] == [
        "alpha",
        "Alpha",
        "Beta",
        "Beta",
    ]
    assert [item.machine for item in filter_and_sort_inspections(items, machine_filter="beta")] == ["Beta", "Beta"]
    assert [item.severity for item in filter_and_sort_inspections(items, severity_filter=HIGH)] == [HIGH, HIGH]
