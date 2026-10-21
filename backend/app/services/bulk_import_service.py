import io
from typing import List, Tuple
import openpyxl
from sqlalchemy.orm import Session
from app.models.visitor_pass import VisitorPass
from app.schemas.bulk_import import (
    BulkStudentRow,
    BulkImportPreviewResponse,
    BulkImportConfirmRequest,
    BulkImportConfirmResponse,
)
from app.services.visitor_service import generate_next_pass_number

EXPECTED_COLUMNS = ["Name", "Number", "Address", "Photo File Path"]
EXPECTED_SHEET_NAME = "student-list"


def parse_bulk_excel(file_bytes: bytes) -> BulkImportPreviewResponse:
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    
    # Check sheet name
    if EXPECTED_SHEET_NAME in wb.sheetnames:
        sheet = wb[EXPECTED_SHEET_NAME]
    else:
        # Fallback to active sheet if single sheet
        sheet = wb.active

    rows = list(sheet.iter_rows(values_only=True))
    if not rows:
        raise ValueError("The uploaded Excel sheet is empty.")

    header_row = [str(cell).strip() if cell is not None else "" for cell in rows[0]]
    
    # Validate column headers
    if len(header_row) < len(EXPECTED_COLUMNS) or any(
        header_row[i].lower() != EXPECTED_COLUMNS[i].lower() for i in range(len(EXPECTED_COLUMNS))
    ):
        raise ValueError(
            f"Incorrect column headers. Expected exactly: {', '.join(EXPECTED_COLUMNS)}. "
            f"Found: {', '.join(header_row[:len(EXPECTED_COLUMNS)])}"
        )

    parsed_records: List[BulkStudentRow] = []
    seen_numbers = set()

    for row_idx, row in enumerate(rows[1:], start=2):
        # Ignore empty rows
        if not any(row):
            continue

        name = str(row[0]).strip() if len(row) > 0 and row[0] is not None else ""
        number = str(row[1]).strip() if len(row) > 1 and row[1] is not None else ""
        address = str(row[2]).strip() if len(row) > 2 and row[2] is not None else ""
        photo_path = str(row[3]).strip() if len(row) > 3 and row[3] is not None else ""

        errors = []
        if not name:
            errors.append("Student Name is required.")
        if not number:
            errors.append("Student Number / Register Number is required.")
        elif number in seen_numbers:
            errors.append(f"Duplicate student number '{number}' within sheet.")
        else:
            seen_numbers.add(number)

        parsed_records.append(
            BulkStudentRow(
                name=name,
                number=number,
                address=address or None,
                photo_file_path=photo_path or None,
                errors=errors,
            )
        )

    total = len(parsed_records)
    error_count = sum(1 for r in parsed_records if len(r.errors) > 0)
    valid_count = total - error_count

    return BulkImportPreviewResponse(
        total_records=total,
        valid_records=valid_count,
        error_records=error_count,
        records=parsed_records,
        sheet_name=sheet.title,
    )


def confirm_bulk_import(
    db: Session,
    request: BulkImportConfirmRequest,
    created_by: str = "Access Supervisor",
) -> BulkImportConfirmResponse:
    event = request.event_details
    valid_rows = [r for r in request.records if len(r.errors) == 0]

    if not valid_rows:
        raise ValueError("No valid student records provided for pass issuance.")

    issued_pass_numbers: List[str] = []

    # Use database transaction
    try:
        for row in valid_rows:
            pass_num = generate_next_pass_number(db)
            purpose_str = f"Bulk Event: {event.event_name} - {event.event_purpose}"
            
            pass_obj = VisitorPass(
                pass_number=pass_num,
                visitor_name=row.name,
                visitor_phone=row.number,
                photo_url=row.photo_file_path,
                purpose=purpose_str,
                event_name=event.event_name,
                event_purpose=event.event_purpose,
                start_date=event.from_date,
                end_date=event.to_date,
                accessible_blocks=event.accessible_blocks,
                coordinator_name=event.coordinator_name,
                coordinator_phone=event.coordinator_phone,
                status="Active",
                is_bulk=True,
                created_by=created_by,
            )
            db.add(pass_obj)
            db.flush()  # Flush so generate_next_pass_number gets incremented
            issued_pass_numbers.append(pass_num)

        db.commit()
    except Exception as e:
        db.rollback()
        raise RuntimeError(f"Database transaction failed during bulk pass issuance: {str(e)}")

    return BulkImportConfirmResponse(
        success=True,
        total_issued=len(issued_pass_numbers),
        pass_numbers=issued_pass_numbers,
        message=f"Successfully issued {len(issued_pass_numbers)} bulk student passes for event '{event.event_name}'.",
    )
