from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.db.models import WeatherReport, Source, Media, VerificationResult, AuditLog, ReportEventLink
from app.db.schemas import (
    ReportResponse, CitizenReportCreate, VerifyRejectRequest,
    MergeReportsRequest, VerificationResultResponse
)
from app.pipeline.processor import process_incoming_report
from app.api.websocket import ws_manager

router = APIRouter(prefix="/reports", tags=["Reports"])

def format_report_response(r: WeatherReport) -> dict:
    media_list = []
    for m in r.media:
        media_list.append({
            "id": m.id,
            "object_uri": m.object_uri,
            "media_type": m.media_type,
            "sha256": m.sha256,
            "perceptual_hash": m.perceptual_hash,
            "meta_info": m.meta_info or {},
            "created_at": m.created_at
        })
        
    ver_data = None
    if r.verification_result:
        vr = r.verification_result
        ver_data = {
            "id": vr.id,
            "source_score": vr.source_score,
            "temporal_score": vr.temporal_score,
            "spatial_score": vr.spatial_score,
            "corroboration_score": vr.corroboration_score,
            "media_score": vr.media_score,
            "duplicate_penalty": vr.duplicate_penalty,
            "final_score": vr.final_score,
            "model_version": vr.model_version,
            "decision": vr.decision,
            "reason_breakdown": vr.reason_breakdown
        }
        
    linked_evt = r.event_links[0].event_id if r.event_links else None

    return {
        "id": r.id,
        "source_id": r.source_id,
        "source_name": r.source.name if r.source else "Citizen Submission",
        "source_type": r.source.source_type if r.source else "citizen",
        "text": r.text,
        "event_type": r.event_type,
        "event_confidence": r.event_confidence,
        "reported_at": r.reported_at,
        "ingested_at": r.ingested_at,
        "verification_status": r.verification_status,
        "latitude": r.latitude,
        "longitude": r.longitude,
        "state": r.state,
        "district": r.district,
        "city": r.city,
        "is_duplicate": r.is_duplicate,
        "duplicate_of_id": r.duplicate_of_id,
        "media": media_list,
        "verification": ver_data,
        "linked_event_id": linked_evt
    }

@router.get("", response_model=List[ReportResponse])
def get_reports(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    state: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(WeatherReport)
    
    if event_type and event_type != "ALL":
        query = query.filter(WeatherReport.event_type == event_type)
    if status and status != "ALL":
        query = query.filter(WeatherReport.verification_status == status)
    if state and state != "ALL":
        query = query.filter(WeatherReport.state.ilike(f"%{state}%"))
    if search:
        query = query.filter(WeatherReport.text.ilike(f"%{search}%"))
        
    if from_date:
        try:
            dt_from = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
            query = query.filter(WeatherReport.reported_at >= dt_from)
        except Exception:
            pass
            
    if to_date:
        try:
            dt_to = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
            query = query.filter(WeatherReport.reported_at <= dt_to)
        except Exception:
            pass

    reports = query.order_by(WeatherReport.reported_at.desc()).offset(offset).limit(limit).all()
    return [format_report_response(r) for r in reports]

@router.get("/{report_id}", response_model=ReportResponse)
def get_report_detail(report_id: str, db: Session = Depends(get_db)):
    report = db.query(WeatherReport).filter(WeatherReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Weather report not found")
    return format_report_response(report)

@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_citizen_report(
    payload: CitizenReportCreate,
    db: Session = Depends(get_db)
):
    report_dict = payload.model_dump()
    report = await process_incoming_report(db, report_dict, websocket_manager=ws_manager)
    return format_report_response(report)

@router.post("/{report_id}/verify", response_model=ReportResponse)
async def verify_report(
    report_id: str,
    body: VerifyRejectRequest,
    current_user: dict = Depends(require_role(["moderator", "admin"])),
    db: Session = Depends(get_db)
):
    report = db.query(WeatherReport).filter(WeatherReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Weather report not found")
        
    old_status = report.verification_status
    report.verification_status = "VERIFIED"
    
    if report.verification_result:
        report.verification_result.decision = "VERIFIED"
        report.verification_result.final_score = max(0.90, report.verification_result.final_score)
        
    audit = AuditLog(
        actor_id=current_user.get("id", "admin-1"),
        actor_name=current_user.get("name", "Moderator"),
        action="VERIFY",
        entity_type="report",
        entity_id=report.id,
        old_value={"status": old_status},
        new_value={"status": "VERIFIED", "notes": body.notes, "reason": body.reason}
    )
    db.add(audit)
    db.commit()
    db.refresh(report)
    
    # Broadcast update
    await ws_manager.broadcast({
        "type": "REPORT_STATUS_CHANGED",
        "data": {"id": report.id, "verification_status": "VERIFIED", "moderator": current_user.get("name")}
    })
    
    return format_report_response(report)

@router.post("/{report_id}/reject", response_model=ReportResponse)
async def reject_report(
    report_id: str,
    body: VerifyRejectRequest,
    current_user: dict = Depends(require_role(["moderator", "admin"])),
    db: Session = Depends(get_db)
):
    report = db.query(WeatherReport).filter(WeatherReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Weather report not found")
        
    old_status = report.verification_status
    report.verification_status = "REJECTED"
    
    if report.verification_result:
        report.verification_result.decision = "REJECTED"
        report.verification_result.final_score = min(0.20, report.verification_result.final_score)
        
    audit = AuditLog(
        actor_id=current_user.get("id", "admin-1"),
        actor_name=current_user.get("name", "Moderator"),
        action="REJECT",
        entity_type="report",
        entity_id=report.id,
        old_value={"status": old_status},
        new_value={"status": "REJECTED", "notes": body.notes, "reason": body.reason}
    )
    db.add(audit)
    db.commit()
    db.refresh(report)
    
    await ws_manager.broadcast({
        "type": "REPORT_STATUS_CHANGED",
        "data": {"id": report.id, "verification_status": "REJECTED", "moderator": current_user.get("name")}
    })
    
    return format_report_response(report)

@router.post("/merge")
async def merge_reports(
    body: MergeReportsRequest,
    current_user: dict = Depends(require_role(["moderator", "admin"])),
    db: Session = Depends(get_db)
):
    primary = db.query(WeatherReport).filter(WeatherReport.id == body.primary_report_id).first()
    if not primary:
        raise HTTPException(status_code=404, detail="Primary report not found")
        
    for dup_id in body.duplicate_report_ids:
        dup = db.query(WeatherReport).filter(WeatherReport.id == dup_id).first()
        if dup and dup.id != primary.id:
            dup.is_duplicate = True
            dup.duplicate_of_id = primary.id
            dup.verification_status = "REJECTED"
            
    audit = AuditLog(
        actor_id=current_user.get("id", "admin-1"),
        actor_name=current_user.get("name", "Moderator"),
        action="MERGE",
        entity_type="report",
        entity_id=primary.id,
        old_value=None,
        new_value={"merged_duplicates": body.duplicate_report_ids, "notes": body.notes}
    )
    db.add(audit)
    db.commit()
    
    await ws_manager.broadcast({
        "type": "REPORTS_MERGED",
        "data": {"primary_id": primary.id, "merged_ids": body.duplicate_report_ids}
    })
    
    return {"message": f"Successfully merged {len(body.duplicate_report_ids)} reports into {primary.id}"}
