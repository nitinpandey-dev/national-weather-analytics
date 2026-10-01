from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.auth import router as auth_router, init_demo_users
from app.api.reports import router as reports_router
from app.api.events import router as events_router
from app.api.analytics import router as analytics_router
from app.api.admin import router as admin_router
from app.api.websocket import ws_manager
from app.ingestion.simulator import generate_sample_report, SIMULATED_REPORTS
from app.pipeline.processor import process_incoming_report
from app.db.models import WeatherReport

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("weather-platform")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Initialize demo users and seed data
    db = SessionLocal()
    try:
        init_demo_users(db)
        # Seed initial dataset if empty
        if db.query(WeatherReport).count() == 0:
            logger.info("Database empty. Seeding initial Indian meteorological reports...")
            for i in range(len(SIMULATED_REPORTS)):
                payload = generate_sample_report(i)
                await process_incoming_report(db, payload)
            logger.info("Initial dataset seeded successfully.")
    except Exception as e:
        logger.error(f"Error during startup seeding: {e}")
    finally:
        db.close()
        
    yield
    # Shutdown
    logger.info("Shutting down weather analytics platform...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    description="SIH 2026 PS 26069 — National Weather Big Data Analytics Platform API",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(events_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

# Health endpoint (as specified in api.md)
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION,
        "database": "connected"
    }

# WebSocket endpoint (as specified in api.md)
@app.websocket("/ws/events")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and receive ping/heartbeat
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type": "pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
