import io
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
import openpyxl
from app.core.database import get_db
from app.schemas.bulk_import import (
    BulkImportPreviewResponse,
    BulkImportConfirmRequest,
    BulkImportConfirmResponse,
)
from app.services.bulk_import_service import (
    parse_bulk_excel,
    confirm_bulk_import,
    EXPECTED_COLUMNS,
    EXPECTED_SHEET_NAME,
)
from app.api.deps import require_roles
from app.models.user import User

router = APIRouter(prefix="/bulk-import", tags=["Bulk Import"])


@router.get("/template")
def download_sample_template():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = EXPECTED_SHEET_NAME

    # Header row
    ws.append(EXPECTED_COLUMNS)

    # Sample rows matching the original Figma specification
    sample_rows = [
        ["Ananya Krishnan", "23ECE0721", "12 Lake View Road, Chennai", "photos/ananya_krishnan.jpg"],
        ["Rahul Menon", "22CSE1048", "45 Park Street, Bengaluru", ""],
        ["Deepa Varma", "VIS-2048", "8 College Road, Kochi", "photos/deepa_varma.jpg"],
    ]
    for row in sample_rows:
        ws.append(row)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    headers = {
        "Content-Disposition": 'attachment; filename="CampusSecure_Student_Entry_Template.xlsx"',
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    return Response(content=output.getvalue(), headers=headers, media_type=headers["Content-Type"])


@router.post("/preview", response_model=BulkImportPreviewResponse)
async def preview_bulk_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["access-supervisor", "supervisor", "admin"])),
):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Please upload a valid Excel (.xlsx) file.",
        )

    content = await file.read()
    try:
        preview = parse_bulk_excel(content)
        return preview
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/confirm", response_model=BulkImportConfirmResponse)
def confirm_bulk_passes(
    request: BulkImportConfirmRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["access-supervisor", "supervisor", "admin"])),
):
    try:
        return confirm_bulk_import(db, request, created_by=current_user.full_name)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=400, detail=str(e))
