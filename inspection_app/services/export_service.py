from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

from database import to_local_time

from .inspection_service import fetch_inspection_history
from ..utils.image_utils import resolve_upload_path
from ..utils.inspection_utils import parse_image_links, severity_export_text
from ..utils.workbook_utils import add_images_to_worksheet


def export_inspections_to_excel(machine_filter="", severity_filter="", sort_order="latest", upload_folder=""):
    inspections = fetch_inspection_history(
        machine_filter=machine_filter,
        severity_filter=severity_filter,
        sort_order=sort_order,
    )

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Inspection History"

    headers = ["Machine", "Images", "Issue", "Severity", "Note", "Date"]
    worksheet.append(headers)

    header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")

    for cell in worksheet[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")

    current_row = 2
    for inspection in inspections:
        image_links = parse_image_links(inspection.image_links)
        resolved_paths = [resolve_upload_path(upload_folder, image_path) for image_path in image_links]
        valid_image_paths = [image_path for image_path in resolved_paths if image_path]
        local_timestamp = to_local_time(inspection.timestamp)

        worksheet.append(
            [
                inspection.machine,
                "",
                inspection.issue or "-",
                severity_export_text(inspection.severity),
                inspection.remark or "-",
                local_timestamp.strftime("%Y-%m-%d %H:%M:%S") if local_timestamp else "-",
            ]
        )

        for column_name in ["A", "C", "D", "E", "F"]:
            worksheet[f"{column_name}{current_row}"].alignment = Alignment(
                horizontal="center" if column_name in ["D", "F"] else "left",
                vertical="center",
                wrap_text=True,
            )

        image_cell = f"B{current_row}"
        worksheet[image_cell].alignment = Alignment(horizontal="center", vertical="center")

        if valid_image_paths:
            total_image_height = add_images_to_worksheet(worksheet, current_row, valid_image_paths, start_column_index=1)
            worksheet.row_dimensions[current_row].height = max(110, total_image_height * 0.75)
        else:
            worksheet[image_cell] = "ไม่มีรูป"
            worksheet.row_dimensions[current_row].height = 110

        current_row += 1

    worksheet.column_dimensions["A"].width = 20
    worksheet.column_dimensions["B"].width = 34
    worksheet.column_dimensions["C"].width = 30
    worksheet.column_dimensions["D"].width = 18
    worksheet.column_dimensions["E"].width = 30
    worksheet.column_dimensions["F"].width = 20

    excel_io = BytesIO()
    workbook.save(excel_io)
    excel_io.seek(0)
    return excel_io
