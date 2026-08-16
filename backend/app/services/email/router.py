import os
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, EmailStr, Field

from .config import settings
from .service import EmailService

router = APIRouter(prefix="/api/email", tags=["Email Notification Service"])

# --- Request Models ---

class TestEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str = "Test Email Connection"
    body: str = "This is a test notification from the UC09 Member Risk system."

class ShapDriverModel(BaseModel):
    feature: str
    value: Any
    shap_value: float = Field(..., alias="shap_value")
    description: Optional[str] = None

    class Config:
        populate_by_name = True

class RiskAlertRequest(BaseModel):
    to_email: EmailStr
    provider_name: str
    member_id: str
    member_name: str
    member_code: str
    age: int
    gender: str
    risk_level: str
    overall_score: int
    shap_drivers: List[ShapDriverModel]
    portal_url: Optional[str] = "http://localhost:3000"

class InterventionReminderRequest(BaseModel):
    to_email: EmailStr
    coordinator_name: str
    member_name: str
    member_code: str
    intervention_title: str
    category: str
    due_date: str
    priority: str
    description: str
    portal_url: Optional[str] = "http://localhost:3000"

class FlaggedMemberModel(BaseModel):
    name: str
    code: str
    score: int
    level: str
    barrier: str

class WeeklyDigestRequest(BaseModel):
    to_email: EmailStr
    coordinator_name: str
    total_members: int
    very_high_count: int
    high_count: int
    active_interventions: int
    flagged_members: List[FlaggedMemberModel]
    portal_url: Optional[str] = "http://localhost:3000"
    attach_report: Optional[bool] = False

# --- API Router Routes ---

@router.post("/test")
async def send_test_email(payload: TestEmailRequest):
    """Sends a basic test email to verify configuration."""
    try:
        html_content = f"""
        <html>
            <body style="font-family: sans-serif; padding: 20px;">
                <h2 style="color: #0d9488;">Test Notification</h2>
                <p>{payload.body}</p>
                <hr style="border: 1px solid #eee;" />
                <p style="font-size: 11px; color: #666;">Sent from UC09 Member Risk System</p>
            </body>
        </html>
        """
        result = EmailService.send_email(
            to_email=payload.to_email,
            subject=payload.subject,
            html_content=html_content,
            text_content=payload.body
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


@router.post("/alert/risk")
async def send_risk_alert(payload: RiskAlertRequest, background_tasks: BackgroundTasks):
    """Triggers an email alert for a high-risk member (runs in background)."""
    # Parse Pydantic SHAP driver models back to raw dicts
    drivers_list = [d.model_dump(by_alias=True) for d in payload.shap_drivers]
    
    # Run email sending in background to avoid blocking API response
    background_tasks.add_task(
        EmailService.send_clinical_risk_alert,
        to_email=payload.to_email,
        provider_name=payload.provider_name,
        member_id=payload.member_id,
        member_name=payload.member_name,
        member_code=payload.member_code,
        age=payload.age,
        gender=payload.gender,
        risk_level=payload.risk_level,
        overall_score=payload.overall_score,
        shap_drivers=drivers_list,
        portal_url=payload.portal_url
    )
    
    return {
        "status": "queued",
        "message": f"Clinical risk alert email queued for {payload.to_email}"
    }


@router.post("/alert/intervention")
async def send_intervention_alert(payload: InterventionReminderRequest, background_tasks: BackgroundTasks):
    """Triggers a care intervention reminder email (runs in background)."""
    background_tasks.add_task(
        EmailService.send_intervention_reminder,
        to_email=payload.to_email,
        coordinator_name=payload.coordinator_name,
        member_name=payload.member_name,
        member_code=payload.member_code,
        intervention_title=payload.intervention_title,
        category=payload.category,
        due_date=payload.due_date,
        priority=payload.priority,
        description=payload.description,
        portal_url=payload.portal_url
    )
    
    return {
        "status": "queued",
        "message": f"Intervention reminder email queued for {payload.to_email}"
    }


@router.post("/digest")
async def send_weekly_digest(payload: WeeklyDigestRequest, background_tasks: BackgroundTasks):
    """Triggers the weekly cohort summary digest email (runs in background)."""
    flagged = [m.model_dump() for m in payload.flagged_members]
    
    attachments = None
    if payload.attach_report:
        # Generate a mock CSV report file
        csv_header = "member_code,member_name,risk_score,risk_level,top_barrier\n"
        csv_rows = []
        for m in payload.flagged_members:
            csv_rows.append(f'"{m.code}","{m.name}",{m.score},"{m.level}","{m.barrier}"\n')
        
        csv_content = (csv_header + "".join(csv_rows)).encode("utf-8")
        attachments = [{
            "filename": f"cohort_action_report_{datetime.now().strftime('%Y%m%d')}.csv",
            "content": csv_content,
            "content_type": "text/csv"
        }]

    background_tasks.add_task(
        EmailService.send_weekly_cohort_digest,
        to_email=payload.to_email,
        coordinator_name=payload.coordinator_name,
        total_members=payload.total_members,
        very_high_count=payload.very_high_count,
        high_count=payload.high_count,
        active_interventions=payload.active_interventions,
        flagged_members=flagged,
        portal_url=payload.portal_url,
        attachments=attachments
    )
    
    return {
        "status": "queued",
        "message": f"Weekly digest summary email queued for {payload.to_email} (with attachment={payload.attach_report})"
    }


@router.get("/sent-logs")
async def get_sent_email_logs():
    """Retrieves the list of sent mock emails from the JSON logs file in Mock Mode."""
    logs_file_path = os.path.join(settings.sent_emails_dir, "sent_logs.json")
    if not os.path.exists(logs_file_path):
        return []
        
    try:
        with open(logs_file_path, "r", encoding="utf-8") as lf:
            return json.load(lf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read logs: {str(e)}")
