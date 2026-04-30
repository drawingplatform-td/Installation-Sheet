# เอกสารการทดสอบระบบ Machine Inspection

เอกสารนี้อธิบายวิธีรันชุดทดสอบของโปรเจกต์ Machine Inspection และวิธีตรวจสอบ coverage ขั้นต่ำ 80%

## เป้าหมายของชุดทดสอบ

ชุดทดสอบนี้ครอบคลุมฝั่ง Python backend เป็นหลัก ได้แก่ Flask routes, service layer, utility functions, image handling และ Excel export

เป้าหมาย coverage รวมถูกตั้งไว้ที่ 80% ผ่าน `pytest-cov`

## โครงสร้างไฟล์ทดสอบ

```text
tests/
  conftest.py
  test_export_service.py
  test_image_utils.py
  test_inspection_service.py
  test_inspection_utils.py
  test_routes.py
```

ไฟล์สำคัญ:

- `tests/conftest.py` รวม fixtures กลาง เช่น Flask test app, temporary database, temporary upload folder และ helper สร้างรูปจำลอง
- `tests/test_inspection_utils.py` ทดสอบการ parse รูป, severity mapping และ sort/filter
- `tests/test_image_utils.py` ทดสอบการบันทึก, resolve และลบไฟล์รูป
- `tests/test_inspection_service.py` ทดสอบ create, update, delete inspection records
- `tests/test_export_service.py` ทดสอบ Excel export รวมถึงกรณีหลายรูปมากกว่า 4 รูป
- `tests/test_routes.py` ทดสอบ API routes หลักผ่าน Flask test client

## การติดตั้ง dependency

ติดตั้ง Python dependencies ทั้งหมดจาก `requirements.txt`

```powershell
pip install -r requirements.txt
```

dependency ที่เกี่ยวกับ test:

- `pytest`
- `pytest-cov`

## วิธีรันทดสอบ

แนะนำให้รันผ่าน Python module เพื่อไม่ต้องพึ่ง PATH ของ `pytest.exe`

```powershell
python -m pytest
```

คำสั่งนี้จะ:

- ค้นหา test ในโฟลเดอร์ `tests/`
- รัน test ทั้งหมด
- แสดง coverage รายไฟล์
- fail ถ้า coverage รวมต่ำกว่า 80%

## วิธีอ่านผลลัพธ์

ตัวอย่างผลลัพธ์ที่ผ่าน:

```text
15 passed
Required test coverage of 80% reached.
Total coverage: 86.72%
```

ถ้า coverage ต่ำกว่า 80% pytest จะจบด้วยสถานะ failed แม้ test case จะผ่านทั้งหมด

## การตั้งค่า pytest

การตั้งค่าหลักอยู่ใน `pytest.ini`

```ini
[pytest]
testpaths = tests
norecursedirs = uploads node_modules __pycache__ .git .pytest_tmp
addopts =
    -p no:cacheprovider
    --basetemp=.pytest_tmp
    --cov=inspection_app
    --cov=database
    --cov-report=term-missing
    --cov-fail-under=80
pythonpath = .
```

หมายเหตุ:

- `--cov=inspection_app` และ `--cov=database` วัด coverage เฉพาะ backend Python
- ไม่รวม frontend JavaScript และ generated CSS
- `--cov-report=term-missing` แสดงบรรทัดที่ยังไม่ถูก test
- `--cov-fail-under=80` บังคับ coverage รวมขั้นต่ำ 80%

## สิ่งที่ชุดทดสอบครอบคลุม

### Inspection utilities

- parse image links จาก JSON, list, newline text และค่าว่าง
- mapping severity เป็น rank และข้อความ export
- filter และ sort ตาม latest, machine A-Z/Z-A และ severity

### Image utilities

- ตรวจนามสกุลไฟล์ที่อนุญาต
- save รูปลง upload folder
- resolve path ของรูปที่บันทึกไว้
- delete รูปที่ถูกลบออกจาก record

### Inspection service

- create record แบบไม่มีรูป
- create record พร้อมรูป
- validate กรณีไม่กรอก machine
- update record โดยคงรูปเดิมบางรูป, ลบรูปเดิมบางรูป และเพิ่มรูปใหม่
- delete record พร้อมลบไฟล์รูปที่เกี่ยวข้อง

### Excel export

- export record ไม่มีรูปและแสดง `No image`
- export record ที่มี 6 รูป และยืนยันว่ารูปถูกใส่ครบ 6 รูป
- ตรวจ header แบบ dynamic เช่น `Image 1`, `Image 2`, ..., `Image N`

### Flask routes

- `GET /`
- `POST /api/save-inspection`
- `GET /api/get-history`
- `DELETE /api/delete/<inspection_id>`
- `GET /api/export-excel`

## Troubleshooting

### pytest command not found

ให้ใช้คำสั่งนี้แทน:

```powershell
python -m pytest
```

### Permission denied ตอนสร้าง temp หรือ cache

ในบางเครื่อง Windows อาจมี policy หรือ permission ทำให้ pytest เขียน temp/cache ไม่ได้ ให้ลอง:

```powershell
python -m pytest --basetemp=.pytest_tmp
```

ถ้ายังติด permission ให้เปิด terminal ด้วยสิทธิ์ที่เขียนโฟลเดอร์โปรเจกต์ได้ หรือรันใน virtual environment ที่ผู้ใช้ปัจจุบันเป็นเจ้าของ

### ต้องการดูเฉพาะ coverage แบบละเอียด

```powershell
python -m pytest --cov=inspection_app --cov=database --cov-report=term-missing
```

## แนวทางเพิ่ม test ในอนาคต

- ถ้าเพิ่ม API ใหม่ ให้เพิ่ม test ใน `tests/test_routes.py`
- ถ้าเพิ่ม business logic ใน service ให้เพิ่ม test ใน `tests/test_inspection_service.py`
- ถ้าเพิ่ม helper function ให้เพิ่ม test ในไฟล์ util ที่เกี่ยวข้อง
- ถ้าเริ่มต้องการวัด frontend coverage ค่อยเพิ่ม JavaScript test runner เช่น Vitest แยกจาก pytest
