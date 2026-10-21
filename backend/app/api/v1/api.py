from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.students import router as students_router
from app.api.v1.staff import router as staff_router
from app.api.v1.guards import router as guards_router
from app.api.v1.visitor_passes import router as visitor_passes_router
from app.api.v1.bulk_import import router as bulk_import_router
from app.api.v1.access_logs import router as access_logs_router
from app.api.v1.users import router as users_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.ai_recognition import router as ai_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(students_router)
api_router.include_router(staff_router)
api_router.include_router(guards_router)
api_router.include_router(visitor_passes_router)
api_router.include_router(bulk_import_router)
api_router.include_router(access_logs_router)
api_router.include_router(users_router)
api_router.include_router(notifications_router)
api_router.include_router(ai_router)
