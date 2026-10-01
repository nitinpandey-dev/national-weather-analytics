from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.db.models import WeatherEvent, WeatherReport, ReportEventLink
from app.db.schemas import EventResponse

router = APIRouter(prefix="/events", tags=["Weather Events"])

def format_event_response(e: WeatherEvent, db: Session) -> dict:
    reports_count = db.query(ReportEventLink).filter(ReportEventLink.event_id == e.id).count()
    return {
        "id": e.id,
        "event_type": e.event_type,
        "title": e.title,
        "description": e.description,
        "latitude": e.latitude,
        "longitude": e.longitude,
        "radius_km": e.radius_km,
        "state": e.state,
        "district": e.district,
        "severity": e.severity,
        "start_time": e.start_time,
        "end_time": e.end_time,
        "confidence": e.confidence,
        "status": e.status,
        "reports_count": reports_count,
        "created_at": e.created_at
    }

@router.get("", response_model=List[EventResponse])
def get_events(
    status: Optional[str] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    state: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(WeatherEvent)
    if status and status != "ALL":
        query = query.filter(WeatherEvent.status == status)
    if event_type and event_type != "ALL":
        query = query.filter(WeatherEvent.event_type == event_type)
    if severity and severity != "ALL":
        query = query.filter(WeatherEvent.severity == severity)
    if state and state != "ALL":
        query = query.filter(WeatherEvent.state.ilike(f"%{state}%"))
        
    events = query.order_by(WeatherEvent.created_at.desc()).limit(limit).all()
    return [format_event_response(e, db) for e in events]

@router.get("/{event_id}")
def get_event_detail(event_id: str, db: Session = Depends(get_db)):
    event = db.query(WeatherEvent).filter(WeatherEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Weather event not found")
        
    linked_reports = (
        db.query(WeatherReport, ReportEventLink.relationship_type)
        .join(ReportEventLink, WeatherReport.id == ReportEventLink.report_id)
        .filter(ReportEventLink.event_id == event.id)
        .all()
    )
    
    reports_data = []
    for r, rel_type in linked_reports:
        reports_data.append({
            "id": r.id,
            "text": r.text,
            "event_type": r.event_type,
            "verification_status": r.verification_status,
            "city": r.city,
            "reported_at": r.reported_at,
            "relationship_type": rel_type
        })
        
    resp = format_event_response(event, db)
    resp["linked_reports"] = reports_data
    return resp
