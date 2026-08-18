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

from .config import settings
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
                        (Member.member_id == str(member_id_str))
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
                sent_at=datetime.now(timezone.utc) if status == "SENT" else None,
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
        """Helper to compile a MIMEMultipart email message."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.from_name} <{settings.from_email}>"
        msg["To"] = to_email

        # Attach text and html versions
        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        if attachments:
            mixed_msg = MIMEMultipart("mixed")
            mixed_msg["Subject"] = msg["Subject"]
            mixed_msg["From"] = msg["From"]
            mixed_msg["To"] = msg["To"]
            
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
        """Saves the email locally as an HTML file in development/fallback mode."""
        os.makedirs(settings.sent_emails_dir, exist_ok=True)
        
        safe_subject = "".join(c for c in subject if c.isalnum() or c in (" ", "-", "_")).rstrip()
        safe_subject = safe_subject.replace(" ", "_").lower()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"email_{timestamp}_{safe_subject}.html"
        file_path = os.path.join(settings.sent_emails_dir, filename)
        
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
                
        existing_logs.insert(0, log_entry)
        
        with open(logs_file_path, "w", encoding="utf-8") as lf:
            json.dump(existing_logs, lf, indent=2)
            
        logger.info(f"[EmailService] Email saved to {file_path}")
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
        """Composes and sends an email via SMTP (or saves to disk if SMTP is not configured or in debug mode)."""
        logger.info(f"[EmailService] Sending email to {to_email} with subject '{subject}'")

        # If SMTP username/password are not set, or debug mode is enabled, save to disk
        has_smtp_credentials = bool(settings.smtp_username and settings.smtp_password)
        if settings.debug_mode or not has_smtp_credentials:
            logger.info(f"[EmailService] SMTP credentials not set or debug mode active. Writing email to local log.")
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
            if settings.use_ssl:
                server = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10)
            else:
                server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
                
            server.ehlo()
            
            if settings.use_tls and not settings.use_ssl:
                server.starttls()
                server.ehlo()
                
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
                
            server.send_message(msg)
            server.quit()
            
            logger.info(f"[EmailService] Email successfully sent to {to_email} via SMTP host {settings.smtp_host}")
            return {
                "success": True,
                "mode": "smtp",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"[EmailService] Failed to send email to {to_email} via SMTP ({settings.smtp_host}:{settings.smtp_port}): {str(e)}")
            raise e

    @classmethod
    def send_rag_intervention_email(
        cls,
        member_id: str,
        risk_score: float | int,
        risk_category: str,
        recommendations: List[Dict[str, Any]],
        recipient_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends an automated notification email to PAYER_VIEWER_EMAIL when a new RAG intervention
        recommendation is generated.
        
        NOTE: Any failure in email delivery is caught and logged, ensuring that recommendation
        generation API requests never fail due to SMTP issues.
        """
        to_email = recipient_email or settings.payer_viewer_email
        subject = f"New Care Intervention Recommendation - Member {member_id}"

        # ----------------------------------------------------
        # 1. COMPILE PLAIN-TEXT CONTENT
        # ----------------------------------------------------
        rec_text_blocks = []
        for idx, rec in enumerate(recommendations, 1):
            concept = rec.get("concept") or rec.get("title") or f"Protocol {idx}"
            priority = str(rec.get("priority", "Standard")).upper()
            feature = rec.get("feature", "Clinical Driver")
            shap_impact = rec.get("shap_impact")
            shap_str = f" (+{shap_impact:.2f})" if (shap_impact is not None and shap_impact > 0) else (f" ({shap_impact:.2f})" if shap_impact is not None else "")
            rationale = rec.get("rationale") or rec.get("description") or "N/A"
            action = rec.get("recommended_action") or rec.get("action_required") or "N/A"
            next_step = rec.get("next_step") or "N/A"
            
            evidence_sources = rec.get("evidence_sources") or []
            evidence_lines = ""
            if evidence_sources:
                evidence_lines = "\n   Supporting Evidence:\n" + "\n".join(
                    [f"   - {src.get('source', 'Guideline')} (Doc: {src.get('document', src.get('chunk_id', 'N/A'))})" for src in evidence_sources]
                )

            rec_text_blocks.append(
                f"{idx}. {concept}\n"
                f"   Priority: {priority}\n"
                f"   Risk Driver: {feature}{shap_str}\n"
                f"   Why this is recommended:\n   {rationale}\n"
                f"   Recommended Action:\n   {action}\n"
                f"   Next Step:\n   {next_step}"
                f"{evidence_lines}"
            )

        recs_text = "\n\n".join(rec_text_blocks) if rec_text_blocks else "No active protocols generated."

        plain_text = f"""New Care Intervention Recommendation

Member ID: {member_id}
Risk Score: {float(risk_score):.1f}
Risk Category: {risk_category}

Interventions Generated ({len(recommendations)}):
{recs_text}

--------------------------------------------------------------------------------
This intervention has been generated by the CareRiskPulse RAG intervention engine.
"""

        # ----------------------------------------------------
        # 2. COMPILE HTML CONTENT
        # ----------------------------------------------------
        rec_html_blocks = []
        for idx, rec in enumerate(recommendations, 1):
            concept = rec.get("concept") or rec.get("title") or f"Protocol {idx}"
            priority = str(rec.get("priority", "Standard")).upper()
            priority_color = "#e11d48" if priority in ("HIGH", "URGENT") else ("#d97706" if priority == "MEDIUM" else "#059669")
            priority_bg = "#ffe4e6" if priority in ("HIGH", "URGENT") else ("#fef3c7" if priority == "MEDIUM" else "#d1fae5")
            
            feature = rec.get("feature", "Clinical Driver")
            shap_impact = rec.get("shap_impact")
            shap_str = f" <span style=\"color:#0d9488; font-weight:bold;\">[SHAP Impact: +{shap_impact:.2f}]</span>" if (shap_impact is not None and shap_impact > 0) else (f" <span style=\"color:#0d9488; font-weight:bold;\">[SHAP Impact: {shap_impact:.2f}]</span>" if shap_impact is not None else "")
            
            rationale = rec.get("rationale") or rec.get("description") or "N/A"
            action = rec.get("recommended_action") or rec.get("action_required") or "N/A"
            next_step = rec.get("next_step") or "N/A"
            
            evidence_sources = rec.get("evidence_sources") or []
            evidence_html = ""
            if evidence_sources:
                sources_li = "".join([f"<li><strong>{src.get('source', 'Guideline')}</strong> &mdash; <em>{src.get('document', src.get('chunk_id', 'N/A'))}</em></li>" for src in evidence_sources])
                evidence_html = f"""
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #64748b;">
                    <strong>Supporting Evidence (FAISS Retrieval):</strong>
                    <ul style="margin: 4px 0 0 0; padding-left: 20px;">{sources_li}</ul>
                </div>
                """

            rec_html_blocks.append(f"""
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 15px; color: #0f172a;">{idx}. {concept}</h3>
                    <span style="background: {priority_bg}; color: {priority_color}; border: 1px solid {priority_color}; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: bold;">
                        {priority} PRIORITY
                    </span>
                </div>
                <p style="margin: 4px 0 10px 0; font-size: 12px; color: #475569;">
                    <strong>Target Risk Driver:</strong> <code>{feature}</code> {shap_str}
                </p>
                <div style="background: #f8fafc; border-left: 3px solid #0d9488; padding: 8px 12px; margin-bottom: 8px; font-size: 12px; color: #334155;">
                    <strong>Why this is recommended:</strong><br/>
                    {rationale}
                </div>
                <div style="background: #f0fdfa; border-left: 3px solid #14b8a6; padding: 8px 12px; margin-bottom: 8px; font-size: 12px; color: #0f766e;">
                    <strong>Recommended Action:</strong><br/>
                    {action}
                </div>
                <div style="margin-top: 6px; font-size: 12px; color: #b45309;">
                    <strong>Next Step:</strong> {next_step}
                </div>
                {evidence_html}
            </div>
            """)

        recs_html = "".join(rec_html_blocks) if rec_html_blocks else "<p style='color: #64748b;'>No active protocols generated.</p>"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: #0f172a; padding: 20px 24px;">
            <h1 style="color: #2dd4bf; margin: 0; font-size: 20px; letter-spacing: -0.5px;">CareRiskPulse</h1>
            <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 12px;">Clinical Decision Support &bull; Automated Intervention Notification</p>
        </div>

        <!-- Summary Banner -->
        <div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 16px 24px;">
            <h2 style="margin: 0 0 10px 0; font-size: 16px; color: #0f172a;">New Care Intervention Recommendation</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                    <td style="padding: 4px 0; color: #64748b; width: 140px;">Member ID:</td>
                    <td style="padding: 4px 0; font-weight: bold; color: #0f172a; font-family: monospace;">{member_id}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; color: #64748b;">Risk Score:</td>
                    <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">{float(risk_score):.1f} / 100</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; color: #64748b;">Risk Category:</td>
                    <td style="padding: 4px 0; font-weight: bold; color: #0d9488;">{risk_category}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; color: #64748b;">Interventions:</td>
                    <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">{len(recommendations)} Formulated</td>
                </tr>
            </table>
        </div>

        <!-- Recommendations Body -->
        <div style="padding: 20px 24px; background: #f8fafc;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Formulated Protocols</h3>
            {recs_html}
        </div>

        <!-- Footer -->
        <div style="background: #ffffff; border-top: 1px solid #e2e8f0; padding: 16px 24px; font-size: 11px; color: #94a3b8; text-align: center;">
            <p style="margin: 0 0 4px 0;">This intervention has been generated by the CareRiskPulse RAG intervention engine.</p>
            <p style="margin: 0;">Confidential Healthcare Notification &bull; Protected Health Information (PHI)</p>
        </div>
    </div>
</body>
</html>
"""

        # ----------------------------------------------------
        # 3. SEND EMAIL & RECORD (NON-BLOCKING ON ERROR)
        # ----------------------------------------------------
        try:
            res = cls.send_email(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                text_content=plain_text,
            )
            cls._record_in_db(
                recipient_email=to_email,
                subject=subject,
                notification_type="RAG Intervention Generated",
                member_id_str=member_id,
                status="SENT",
            )
            return {"success": True, "mode": res.get("mode", "smtp")}
        except Exception as e:
            logger.error(f"[EmailService] Automated email notification failed for member {member_id}: {e}")
            cls._record_in_db(
                recipient_email=to_email,
                subject=subject,
                notification_type="RAG Intervention Generated",
                member_id_str=member_id,
                status="FAILED",
                error_message=str(e),
            )
            # Do NOT propagate the exception - recommendation must succeed
            return {"success": False, "error": str(e)}
