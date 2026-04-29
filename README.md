# ระบบบันทึกรายการตรวจสอบเครื่องจักร

โปรเจกต์นี้เป็นเว็บแอปสำหรับบันทึกรายการตรวจสอบเครื่องจักร พร้อมแนบรูปภาพ แก้ไขรายการย้อนหลัง และ Export ข้อมูลเป็น Excel

## ความต้องการเบื้องต้น

- Python 3.10 ขึ้นไป
- Node.js 18 ขึ้นไป
- npm

## โครงสร้างไฟล์สำคัญ

- `server.py` ใช้สำหรับรัน Flask server
- `requirements.txt` รายการ Python package
- `package.json` รายการ frontend tools สำหรับ build CSS
- `static/` ไฟล์หน้าเว็บและ CSS
- `uploads/` เก็บรูปที่อัปโหลด
- `inspection.db` ฐานข้อมูล SQLite

## วิธีติดตั้ง

### 1. Clone หรือเปิดโปรเจกต์

```powershell
cd "C:\Installation Sheet 1"
```

### 2. สร้าง Virtual Environment

```powershell
python -m venv .venv
```

### 3. เปิดใช้งาน Virtual Environment

```powershell
.venv\Scripts\Activate.ps1
```

ถ้าใช้งาน Command Prompt:

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

### 6. Build ไฟล์ Tailwind CSS

```powershell
npm run build:css
```

ถ้าต้องการให้ CSS rebuild อัตโนมัติระหว่างแก้หน้าเว็บ:

```powershell
npm run watch:css
```

## วิธีรันโปรเจกต์

### 1. เปิด Virtual Environment

```powershell
.venv\Scripts\Activate.ps1
```

### 2. รันระบบ

```powershell
python server.py
```

เมื่อรันสำเร็จ จะเข้าใช้งานได้ที่:

- `http://localhost:5000`
- หรือ IP ในวงแลนที่ระบบแสดงในหน้าจอ

## หมายเหตุ

- ระบบจะสร้างโฟลเดอร์ `uploads/` อัตโนมัติถ้ายังไม่มี
- ฐานข้อมูลหลักใช้ไฟล์ `inspection.db`
- ถ้าแก้ `static/index.html` หรือไฟล์ใน `static/js/` ควรสั่ง `npm run build:css` ใหม่ก่อนใช้งานจริง

## คำสั่งตรวจสอบเบื้องต้น

ตรวจ syntax ฝั่ง Python:

```powershell
python -m py_compile server.py database.py config.py
```

## การใช้งานแบบออฟไลน์ในเครื่องเดียวกัน

- หลังติดตั้ง dependency และ build CSS แล้ว ระบบสามารถรันในเครื่องได้โดยไม่ต้องพึ่ง CDN
- รูปภาพและฐานข้อมูลถูกเก็บไว้ในเครื่องภายในโปรเจกต์นี้
