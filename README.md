# MyOsteopathy - JSON Mapper

A tool to upload, map, and send patient data to your backend.

---

## Quick Start

### Frontend Setup

```sh
npm install
npm run dev
```

### Connect to Your Backend

Open `src/config/api.ts` and change this line:

```typescript
export const API_BASE_URL = "http://localhost:8000";
```

Replace with your FastAPI server URL.

---

## API Endpoints

### 1. Import Patients (Required)

**Method:** `POST`
**URL:** `/api/v1/patients/import`

Imports mapped patient records into the database. This is the primary endpoint used when the user clicks "Process & Validate".

**Request Body:**
```json
{
  "records": [
    {
      "patient_id": "P001",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1990-05-15",
      "email": "john@email.com",
      "phone": "555-0123"
    }
  ]
}
```

**Success Response (`200`):**
```json
{
  "success": true,
  "imported_count": 1,
  "message": "Records imported"
}
```

**Error Response (`422`):**
```json
{
  "success": false,
  "imported_count": 0,
  "errors": ["Invalid date format in row 3"],
  "message": "Import failed"
}
```

---

### 2. Validate Data (Optional)

**Method:** `POST`
**URL:** `/api/v1/data/validate`

Pre-validates records before importing. Use this for a dry-run check.

**Request Body:**
```json
{
  "records": [
    {
      "patient_id": "P001",
      "first_name": "John",
      "last_name": "Doe"
    }
  ]
}
```

**Success Response (`200`):**
```json
{
  "valid": true,
  "errors": []
}
```

**Validation Error Response (`200`):**
```json
{
  "valid": false,
  "errors": [
    {
      "row": 2,
      "field": "date_of_birth",
      "message": "Invalid date format, expected YYYY-MM-DD"
    }
  ]
}
```

---

### 3. Get Mapping Templates (Optional)

**Method:** `GET`
**URL:** `/api/v1/templates`

Retrieves saved field mapping templates.

**Response (`200`):**
```json
{
  "templates": [
    {
      "id": "tpl_001",
      "name": "Default Patient Import",
      "mappings": [
        { "sourceField": "fname", "targetField": "first_name" }
      ],
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

---

### 4. Save Mapping Template (Optional)

**Method:** `POST`
**URL:** `/api/v1/templates`

Saves a new field mapping template for reuse.

**Request Body:**
```json
{
  "name": "My Custom Template",
  "mappings": [
    { "sourceField": "fname", "targetField": "first_name" },
    { "sourceField": "lname", "targetField": "last_name" }
  ]
}
```

**Response (`201`):**
```json
{
  "id": "tpl_002",
  "created_at": "2026-03-01T14:00:00Z"
}
```

---

### 5. Health Check (Optional)

**Method:** `GET`
**URL:** `/api/v1/health`

Verifies the backend is running and reachable.

**Response (`200`):**
```json
{
  "status": "ok",
  "version": "1.0.0"
}
```

---

## FastAPI Backend Reference

Copy this code to create your backend:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PatientRecord(BaseModel):
    patient_id: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_id: Optional[str] = None
    primary_physician: Optional[str] = None
    diagnosis_code: Optional[str] = None
    procedure_code: Optional[str] = None
    visit_date: Optional[str] = None
    notes: Optional[str] = None

class ImportRequest(BaseModel):
    records: List[PatientRecord]

class ImportResponse(BaseModel):
    success: bool
    imported_count: int
    errors: Optional[List[str]] = None
    message: Optional[str] = None

class ValidationError(BaseModel):
    row: int
    field: str
    message: str

class ValidationResponse(BaseModel):
    valid: bool
    errors: List[ValidationError]

class FieldMapping(BaseModel):
    sourceField: str
    targetField: str

class TemplateSaveRequest(BaseModel):
    name: str
    mappings: List[FieldMapping]

class Template(BaseModel):
    id: str
    name: str
    mappings: List[FieldMapping]
    created_at: str

# ---- Endpoints ----

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

@app.post("/api/v1/patients/import", response_model=ImportResponse)
def import_patients(request: ImportRequest):
    for record in request.records:
        print(f"Saving patient: {record.first_name} {record.last_name}")
        # TODO: Add your database logic here
    return ImportResponse(
        success=True,
        imported_count=len(request.records),
        message="Records imported"
    )

@app.post("/api/v1/data/validate", response_model=ValidationResponse)
def validate_data(request: ImportRequest):
    errors = []
    for i, record in enumerate(request.records):
        if not record.patient_id:
            errors.append(ValidationError(row=i, field="patient_id", message="Missing patient_id"))
    return ValidationResponse(valid=len(errors) == 0, errors=errors)

@app.get("/api/v1/templates")
def get_templates():
    # TODO: Load from database
    return {"templates": []}

@app.post("/api/v1/templates", status_code=201)
def save_template(request: TemplateSaveRequest):
    import uuid, datetime
    return {
        "id": f"tpl_{uuid.uuid4().hex[:6]}",
        "created_at": datetime.datetime.utcnow().isoformat() + "Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Run Your Backend

```sh
pip install fastapi uvicorn pydantic
python main.py
```

Your API will be running at `http://localhost:8000`

---

## Patient Data Fields

| Field | Required | Example |
|-------|----------|---------|
| patient_id | Yes | "P001" |
| first_name | Yes | "John" |
| last_name | Yes | "Doe" |
| date_of_birth | Yes | "1990-05-15" |
| gender | No | "Male" |
| email | No | "john@email.com" |
| phone | No | "555-0123" |
| address | No | "123 Main St" |
| city | No | "New York" |
| state | No | "NY" |
| zip_code | No | "10001" |
| insurance_provider | No | "Blue Cross" |
| insurance_id | No | "BC123456" |
| primary_physician | No | "Dr. Smith" |
| diagnosis_code | No | "M54.5" |
| procedure_code | No | "97140" |
| visit_date | No | "2024-01-15" |
| notes | No | "Initial visit" |

---

## How It Works

1. **Upload** – Drop a JSON or CSV file
2. **Preview** – View the raw data in the Data Preview panel
3. **Process** – Click "Process & Validate" to send data to the backend
4. **Map** – Review the field mappings from the backend response
5. **Download** – Click "Download JSON" to export the mapped data

---

## Files to Know

```
src/config/api.ts     → API URL and endpoint configuration
src/components/mapper/ → All mapper UI components
README.md             → This file
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Network error" | Check if backend is running |
| "CORS error" | Add your frontend URL to `allow_origins` |
| "Connection refused" | Verify the API URL in `src/config/api.ts` |
| "422 Unprocessable" | Check that your JSON matches the expected schema |

---

© 2026 MyOsteopathy
