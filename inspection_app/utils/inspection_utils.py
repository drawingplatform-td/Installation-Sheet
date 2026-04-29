import json

from sqlalchemy import case, func


SEVERITY_RANK_MAP = {
    "ต่ำ": 1,
    "กลาง": 2,
    "สูง": 3,
}

SEVERITY_LABEL_EN_MAP = {
    "ต่ำ": "Low",
    "กลาง": "Medium",
    "สูง": "High",
}

SEVERITY_EXPORT_TEXT_MAP = {
    "ต่ำ": "Low\nRoutine maintenance cycle",
    "กลาง": "Medium\nPlan corrective action soon",
    "สูง": "High\nUrgent - fix immediately",
}


def parse_image_links(raw_value):
    if not raw_value:
        return []

    if isinstance(raw_value, list):
        return [item for item in raw_value if item]

    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, list):
            return [item for item in parsed if item]
    except Exception:
        pass

    return [line.strip() for line in str(raw_value).splitlines() if line.strip()]


def severity_rank(severity):
    return SEVERITY_RANK_MAP.get(severity, 0)


def severity_label_en(severity):
    return SEVERITY_LABEL_EN_MAP.get((severity or "").strip(), severity or "-")


def severity_export_text(severity):
    return SEVERITY_EXPORT_TEXT_MAP.get((severity or "").strip(), severity_label_en(severity))


def sort_timestamp(item):
    return item.timestamp.timestamp() if item and item.timestamp else 0


def build_inspection_query(
    query,
    machine_column,
    severity_column,
    timestamp_column,
    machine_filter="",
    severity_filter="",
    sort_order="latest",
):
    machine_filter = (machine_filter or "").strip().lower()
    severity_filter = (severity_filter or "").strip()
    sort_order = (sort_order or "latest").strip() or "latest"

    severity_sort = case(
        (severity_column == "ต่ำ", 1),
        (severity_column == "กลาง", 2),
        (severity_column == "สูง", 3),
        else_=0,
    )
    normalized_machine = func.lower(func.trim(func.coalesce(machine_column, "")))
    normalized_severity = func.trim(func.coalesce(severity_column, ""))

    if machine_filter:
        query = query.filter(normalized_machine == machine_filter)

    if severity_filter:
        query = query.filter(normalized_severity == severity_filter)

    if sort_order == "machine-asc":
        return query.order_by(normalized_machine.asc(), timestamp_column.desc())

    if sort_order == "machine-desc":
        return query.order_by(normalized_machine.desc(), timestamp_column.desc())

    if sort_order == "severity-asc":
        return query.order_by(severity_sort.asc(), timestamp_column.desc())

    if sort_order == "severity-desc":
        return query.order_by(severity_sort.desc(), timestamp_column.desc())

    return query.order_by(timestamp_column.desc())


def filter_and_sort_inspections(inspections, machine_filter="", severity_filter="", sort_order="latest"):
    machine_filter = (machine_filter or "").strip().lower()
    severity_filter = (severity_filter or "").strip()
    sort_order = (sort_order or "latest").strip() or "latest"

    filtered = list(inspections or [])

    if machine_filter:
        filtered = [
            inspection
            for inspection in filtered
            if (inspection.machine or "").strip().lower() == machine_filter
        ]

    if severity_filter:
        filtered = [
            inspection
            for inspection in filtered
            if (inspection.severity or "").strip() == severity_filter
        ]

    if sort_order == "machine-asc":
        return sorted(filtered, key=lambda item: ((item.machine or "").lower(), -sort_timestamp(item)))

    if sort_order == "machine-desc":
        return sorted(
            filtered,
            key=lambda item: ((item.machine or "").lower(), sort_timestamp(item)),
            reverse=True,
        )

    if sort_order == "severity-asc":
        return sorted(filtered, key=lambda item: (severity_rank(item.severity), -sort_timestamp(item)))

    if sort_order == "severity-desc":
        return sorted(
            filtered,
            key=lambda item: (severity_rank(item.severity), sort_timestamp(item)),
            reverse=True,
        )

    return sorted(filtered, key=sort_timestamp, reverse=True)
