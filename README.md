# ระบบบันทึกรายการตรวจสอบเครื่องจักร

เว็บแอปสำหรับบันทึกรายการตรวจสอบเครื่องจักร พร้อมแนบรูปภาพ แก้ไขรายการย้อนหลัง ดูประวัติ และ Export ข้อมูลเป็นไฟล์ Excel

## ความต้องการเบื้องต้น

- Python 3.10 ขึ้นไป
- Node.js 18 ขึ้นไป
- npm

## โครงสร้างไฟล์สำคัญ

- `server.py` ใช้รัน Flask server
- `requirements.txt` รายการ Python package
- `package.json` รายการ frontend tools สำหรับ build CSS
- `static/` ไฟล์หน้าเว็บ CSS และ JavaScript
- `uploads/` โฟลเดอร์เก็บรูปภาพที่อัปโหลด
- `inspection.db` ฐานข้อมูล SQLite

## วิธีติดตั้ง

### 1. เข้าโฟลเดอร์โปรเจกต์

```powershell
cd "C:\Users\nattawat.v\Desktop\machine inspection"
```

### 2. สร้าง Virtual Environment

```powershell
python -m venv .venv
```

### 3. เปิดใช้งาน Virtual Environment

```powershell
.venv\Scripts\Activate.ps1
```

ถ้าใช้ Command Prompt:

```cmd
.venv\Scripts\activate.bat
```

### 4. ติดตั้ง Python dependencies

```powershell
pip install -r requirements.txt
```

### 5. ติดตั้ง Node dependencies

```powershell
npm install
```

### 6. Build Tailwind CSS

```powershell
npm run build:css
```

ถ้าต้องการให้ CSS rebuild อัตโนมัติระหว่างแก้หน้าเว็บ:

```powershell
npm run watch:css
```

## วิธีรันระบบ

```powershell
python server.py
```

เมื่อรันสำเร็จ จะเข้าใช้งานได้ที่:

- `http://localhost:5000`
- URL แบบ Network ที่ระบบแสดงใน terminal สำหรับเครื่องอื่นในวง LAN

## การตรวจสอบก่อนใช้งาน

ตรวจ syntax ฝั่ง Python:

```powershell
python -m compileall server.py config.py database.py inspection_app
```

Build CSS ใหม่:

```powershell
npm run build:css
```

## หมายเหตุ

- ระบบจะสร้างโฟลเดอร์ `uploads/` อัตโนมัติถ้ายังไม่มี
- ฐานข้อมูลหลักใช้ไฟล์ `inspection.db`
- ถ้าแก้ `static/index.html` หรือไฟล์ใน `static/js/` ควรสั่ง `npm run build:css` ใหม่ก่อนใช้งานจริง
- สำหรับใช้งานในวง LAN จริง ควรปิด `debug=True` ใน `server.py` ก่อนเผยแพร่ให้ผู้ใช้อื่น

## การใช้งานแบบออฟไลน์ในเครื่องเดียวกัน

- หลังติดตั้ง dependency และ build CSS แล้ว ระบบสามารถรันในเครื่องได้โดยไม่ต้องพึ่ง CDN
- รูปภาพและฐานข้อมูลถูกเก็บไว้ในเครื่องภายในโปรเจกต์นี้
