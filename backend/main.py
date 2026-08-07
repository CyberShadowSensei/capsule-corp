import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from core.exceptions import AppError
from database import Base, engine
from models import Complaint, IntakeJob  # noqa: F401 — ensure models registered before create_all
from routers.complaints import router as complaints_router
from routers.intake import router as intake_router

logger = logging.getLogger(__name__)

# Create all tables on startup (SQLite dev mode; use Alembic for production)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Complaint Management System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(complaints_router)
app.include_router(intake_router)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    logger.error("AppError: code=%s message=%s", exc.code, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "internal_error", "message": "An unexpected error occurred.", "details": None}},
    )


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}
