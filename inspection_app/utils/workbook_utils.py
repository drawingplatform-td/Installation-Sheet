import os
from io import BytesIO

from openpyxl.drawing.image import Image as XLImage
from openpyxl.drawing.spreadsheet_drawing import AnchorMarker, OneCellAnchor
from openpyxl.drawing.xdr import XDRPositiveSize2D
from openpyxl.utils.units import pixels_to_EMU
from PIL import Image, ImageOps


def create_excel_image_buffer(image_path):
    if not image_path or not os.path.exists(image_path):
        return None

    try:
        with Image.open(image_path) as source:
            prepared = ImageOps.exif_transpose(source)
            width, height = prepared.size

            image_buffer = BytesIO()
            save_image = prepared

            if prepared.mode not in ("RGB", "RGBA", "L"):
                save_image = prepared.convert("RGB")

            save_image.save(image_buffer, format="PNG")
            image_buffer.seek(0)
            return {"buffer": image_buffer, "width": width, "height": height}
    except Exception as error:
        print(f"Error preparing excel image {image_path}: {error}")
        return None


def add_images_to_worksheet(worksheet, row_index, image_paths, start_column_index=1):
    max_display_width = 120
    max_display_height = 90
    columns_per_cell = 2
    gap = 8
    padding = 6
    valid_image_count = 0

    for index, image_path in enumerate(image_paths):
        image_entry = create_excel_image_buffer(image_path)
        if not image_entry:
            continue

        source_width = max(1, image_entry["width"])
        source_height = max(1, image_entry["height"])
        scale = min(max_display_width / source_width, max_display_height / source_height, 1)
        display_width = max(1, int(round(source_width * scale)))
        display_height = max(1, int(round(source_height * scale)))

        excel_image = XLImage(image_entry["buffer"])
        excel_image.width = display_width
        excel_image.height = display_height
        excel_image.anchor = OneCellAnchor(
            _from=AnchorMarker(
                col=start_column_index,
                colOff=pixels_to_EMU(padding + (valid_image_count % columns_per_cell) * (max_display_width + gap)),
                row=row_index - 1,
                rowOff=pixels_to_EMU(padding + (valid_image_count // columns_per_cell) * (max_display_height + gap)),
            ),
            ext=XDRPositiveSize2D(pixels_to_EMU(display_width), pixels_to_EMU(display_height)),
        )
        worksheet.add_image(excel_image)
        valid_image_count += 1

    if valid_image_count == 0:
        return 0

    row_count = ((valid_image_count - 1) // columns_per_cell) + 1
    return padding * 2 + row_count * max_display_height + (row_count - 1) * gap
