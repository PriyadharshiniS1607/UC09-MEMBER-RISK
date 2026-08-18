import os
import smtplib
import json
import logging
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List, Dict, Any
from jinja2 import Template

from .config import settings
from . import templates as email_templates
from app.database.connection import SessionLocal
from app.database.models import EmailNotification, Member

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EmailService")

class EmailService:
    @staticmethod
    def _record_in_db(
        recipient_email: str,
        subject: str,
        notification_type: str,
        member_id_str: Optional[str] = None,
        status: str = "SENT",
        error_message: Optional[str] = None,
    ):
        """Helper to persist notification audit events to PostgreSQL email_notifications table."""
        try:
            db = SessionLocal()
            resolved_member_db_id = None
            if member_id_str:
                member = (
                    db.query(Member)
                    .filter(
                        (Member.member_id == member_id_str)
                        | (Member.id == int(member_id_str) if str(member_id_str).isdigit() else False)
                    )
                    .first()
                )
                if member:
                    resolved_member_db_id = member.id

            notif = EmailNotification(
                member_id=resolved_member_db_id,
                recipient_email=recipient_email,
                subject=subject,
                notification_type=notification_type,
                status=status,
                error_message=error_message,
                sent_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
            )
            db.add(notif)
            db.commit()
            db.close()
        except Exception as e:
            logger.warning(f"Could not persist EmailNotification to PostgreSQL: {e}")
    @staticmethod
    def _create_message(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> MIMEMultipart:
        """Helper to compile a MIMEMultipart email message with attachments."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.from_name} <{settings.from_email}>"
        msg["To"] = to_email

        # Attach text and html versions
        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        # Attach any file attachments provided
        # Attachment structure: {"filename": str, "content": bytes, "content_type": str}
        if attachments:
            # We want to change content type to mixed to support attachments
            mixed_msg = MIMEMultipart("mixed")
            mixed_msg["Subject"] = msg["Subject"]
            mixed_msg["From"] = msg["From"]
            mixed_msg["To"] = msg["To"]
            
            # Add the alternative text/html parts
            alternative_part = MIMEMultipart("alternative")
            alternative_part.attach(part1)
            alternative_part.attach(part2)
            mixed_msg.attach(alternative_part)
            
            for att in attachments:
                filename = att.get("filename", "attachment")
                content = att.get("content", b"")
                content_type = att.get("content_type", "application/octet-stream")
                
                maintype, subtype = content_type.split("/", 1) if "/" in content_type else ("application", "octet-stream")
                
                part = MIMEBase(maintype, subtype)
                part.set_payload(content)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={filename}",
                )
                mixed_msg.attach(part)
            
            return mixed_msg

        return msg

    @staticmethod
    def _save_to_mock_file(
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """Saves the email locally as an HTML file in development/mock mode."""
        os.makedirs(settings.sent_emails_dir, exist_ok=True)
        
        # Clean subject line for safe filename
        safe_subject = "".join(c for c in subject if c.isalnum() or c in (" ", "-", "_")).rstrip()
        safe_subject = safe_subject.replace(" ", "_").lower()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"email_{timestamp}_{safe_subject}.html"
        file_path = os.path.join(settings.sent_emails_dir, filename)
        
        # Format the file contents so it's a viewable standalone preview of the sent email
        preview_header = f"""<!-- 
MOCK SENT EMAIL PREVIEW
======================
Date: {datetime.now().isoformat()}
To: {to_email}
From: {settings.from_name} <{settings.from_email}>
Subject: {subject}
Attachments: {[a.get('filename') for a in attachments] if attachments else 'None'}
======================
-->
"""
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(preview_header)
            f.write(html_content)

        # Write to JSON logs file for programmatic history retrieval
        logs_file_path = os.path.join(settings.sent_emails_dir, "sent_logs.json")
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "to": to_email,
            "subject": subject,
            "filename": filename,
            "attachments": [a.get("filename") for a in attachments] if attachments else []
        }
        
        existing_logs = []
        if os.path.exists(logs_file_path):
            try:
                with open(logs_file_path, "r", encoding="utf-8") as lf:
                    existing_logs = json.load(lf)
            except Exception:
                existing_logs = []
                
        existing_logs.insert(0, log_entry) # Put newest logs first
        
        with open(logs_file_path, "w", encoding="utf-8") as lf:
            json.dump(existing_logs, lf, indent=2)
            
        logger.info(f"[MockMode] Email saved to {file_path}")
        return file_path

    @classmethod
    def send_email(
        cls,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str,
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Composes and sends an email via SMTP (or saves to disk in Mock Mode)."""
        logger.info(f"Preparing email to {to_email} with subject '{subject}' (Mock Mode = {settings.debug_mode})")
        
        if settings.debug_mode:
            file_path = cls._save_to_mock_file(to_email, subject, html_content, text_content, attachments)
            return {
                "success": True,
                "mode": "mock",
                "file_path": file_path,
                "timestamp": datetime.now().isoformat()
            }

        # Setup SMTP sending
        msg = cls._create_message(to_email, subject, html_content, text_content, attachments)
        
        try:
            # Use SSL directly or standard TLS connection
            if settings.use_ssl:
                server = smtplib.SMTP_SSL(settings.smtp_server, settings.smtp_port)
            else:
                server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
                
            server.ehlo()
            
            if settings.use_tls and not settings.use_ssl:
                server.starttls()
                server.ehlo()
                
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
                
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email successfully sent to {to_email} via SMTP server {settings.smtp_server}")
            return {
                "success": True,
                "mode": "smtp",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via SMTP: {str(e)}")
            raise e

    @classmethod
    def send_clinical_risk_alert(
        cls,
        to_email: str,
        provider_name: str,
        member_id: str,
        member_name: str,
        member_code: str,
        age: int,
        gender: str,
        risk_level: str,
        overall_score: int,
        shap_drivers: List[Dict[str, Any]],
        portal_url: str = "http://localhost:3000"
    ) -> Dict[str, Any]:
        """Compiles and sends a Clinical Risk Alert email."""
        context = {
            "provider_name": provider_name,
            "member_id": member_id,
            "member_name": member_name,
            "member_code": member_code,
            "age": age,
            "gender": gender,
            "risk_level": risk_level,
            "overall_score": overall_score,
            "shap_drivers": shap_drivers,
            "portal_url": portal_url,
            "current_year": datetime.now().year
        }
        
        html_tmpl = Template(email_templates.CLINICAL_RISK_ALERT_HTML)
        text_tmpl = Template(email_templates.CLINICAL_RISK_ALERT_TEXT)
        
        html_content = html_tmpl.render(**context)
        text_content = text_tmpl.render(**context)
        
        subject = f"Clinical Risk Alert: {risk_level} Risk patient ({member_name})"
        res = cls.send_email(to_email, subject, html_content, text_content)
        cls._record_in_db(
            recipient_email=to_email,
            subject=subject,
            notification_type="Clinical Risk Alert",
            member_id_str=member_id or member_code,
            status="SENT",
        )
        return res

    @classmethod
    def send_intervention_reminder(
        cls,
        to_email: str,
        coordinator_name: str,
        member_name: str,
        member_code: str,
        intervention_title: str,
        category: str,
        due_date: str,
        priority: str,
        description: str,
        portal_url: str = "http://localhost:3000"
    ) -> Dict[str, Any]:
        """Compiles and sends an Intervention Reminder email."""
        context = {
            "coordinator_name": coordinator_name,
            "member_name": member_name,
            "member_code": member_code,
            "intervention_title": intervention_title,
            "category": category,
            "due_date": due_date,
            "priority": priority,
            "description": description,
            "portal_url": portal_url,
            "current_year": datetime.now().year
        }
        
        html_tmpl = Template(email_templates.INTERVENTION_REMINDER_HTML)
        text_tmpl = Template(email_templates.INTERVENTION_REMINDER_TEXT)
        
        html_content = html_tmpl.render(**context)
        text_content = text_tmpl.render(**context)
        
        subject = f"Care Intervention Action Required: {member_name} ({priority})"
        res = cls.send_email(to_email, subject, html_content, text_content)
        cls._record_in_db(
            recipient_email=to_email,
            subject=subject,
            notification_type="Intervention Reminder",
            member_id_str=member_code or member_name,
            status="SENT",
        )
        return res

    @classmethod
    def send_weekly_cohort_digest(
        cls,
        to_email: str,
        coordinator_name: str,
        total_members: int,
        very_high_count: int,
        high_count: int,
        active_interventions: int,
        flagged_members: List[Dict[str, Any]],
        portal_url: str = "http://localhost:3000",
        attachments: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Compiles and sends a Weekly Cohort Digest email."""
        context = {
            "coordinator_name": coordinator_name,
            "total_members": total_members,
            "very_high_count": very_high_count,
            "high_count": high_count,
            "active_interventions": active_interventions,
            "flagged_members": flagged_members,
            "portal_url": portal_url,
            "current_year": datetime.now().year
        }
        
        html_tmpl = Template(email_templates.WEEKLY_COHORT_DIGEST_HTML)
        text_tmpl = Template(email_templates.WEEKLY_COHORT_DIGEST_TEXT)
        
        html_content = html_tmpl.render(**context)
        text_content = text_tmpl.render(**context)
        
        subject = f"Member Risk Panel Weekly Cohort Summary Digest"
        res = cls.send_email(to_email, subject, html_content, text_content, attachments)
        cls._record_in_db(
            recipient_email=to_email,
            subject=subject,
            notification_type="Weekly Digest",
            member_id_str=None,
            status="SENT",
        )
        return res
