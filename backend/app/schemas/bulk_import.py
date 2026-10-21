from typing import List, Optional
from pydantic import BaseModel, Field


class BulkStudentRow(BaseModel):
    name: str
    number: str
    address: Optional[str] = None
    photo_file_path: Optional[str] = None
    errors: List[str] = Field(default_factory=list)


class BulkImportEventDetails(BaseModel):
    event_name: str
    event_purpose: str
    from_date: str
    to_date: str
    accessible_blocks: List[str]
    coordinator_name: str
    coordinator_phone: str


class BulkImportPreviewResponse(BaseModel):
    total_records: int
    valid_records: int
    error_records: int
    records: List[BulkStudentRow]
    sheet_name: str


class BulkImportConfirmRequest(BaseModel):
    event_details: BulkImportEventDetails
    records: List[BulkStudentRow]


class BulkImportConfirmResponse(BaseModel):
    success: bool
    total_issued: int
    pass_numbers: List[str]
    message: str
