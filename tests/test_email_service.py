import os
import shutil
import unittest
import tempfile
import json
from unittest.mock import patch
from fastapi.testclient import TestClient

# Ensure backend folder is in Python path for test execution
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))

from app.main import app
from app.services.email.config import settings
from app.services.email.service import EmailService


class TestEmailService(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for email logs to isolate tests
        self.test_dir = tempfile.mkdtemp()
        self.original_debug_mode = settings.debug_mode
        self.original_sent_emails_dir = settings.sent_emails_dir
        
        # Override settings for tests
        settings.debug_mode = True
        settings.sent_emails_dir = self.test_dir

    def tearDown(self):
        # Clean up the directory after tests
        shutil.rmtree(self.test_dir)
        settings.debug_mode = self.original_debug_mode
        settings.sent_emails_dir = self.original_sent_emails_dir

    def test_config_defaults(self):
        """Verify defaults are loaded correctly."""
        self.assertEqual(settings.smtp_server, "localhost")
        self.assertEqual(settings.smtp_port, 587)
        self.assertTrue(settings.debug_mode)
        self.assertEqual(settings.from_email, "noreply@healthfirst.org")

    def test_send_email_mock_mode(self):
        """Test sending email in mock mode creates HTML preview files."""
        to_email = "test_provider@example.com"
        subject = "Patient Update Notification"
        html = "<html><body><h1>Hello User</h1></body></html>"
        text = "Hello User"
        
        result = EmailService.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html,
            text_content=text
        )
        
        self.assertTrue(result["success"])
        self.assertEqual(result["mode"], "mock")
        self.assertTrue(os.path.exists(result["file_path"]))
        
        # Verify preview header exists in file
        with open(result["file_path"], "r", encoding="utf-8") as f:
            content = f.read()
            self.assertIn("MOCK SENT EMAIL PREVIEW", content)
            self.assertIn(f"To: {to_email}", content)
            self.assertIn(f"Subject: {subject}", content)
            self.assertIn("Hello User", content)

        # Verify sent log is written
        logs_path = os.path.join(self.test_dir, "sent_logs.json")
        self.assertTrue(os.path.exists(logs_path))
        with open(logs_path, "r", encoding="utf-8") as lf:
            logs = json.load(lf)
            self.assertEqual(len(logs), 1)
            self.assertEqual(logs[0]["to"], to_email)
            self.assertEqual(logs[0]["subject"], subject)

    def test_send_clinical_risk_alert(self):
        """Test risk alert rendering and mock output."""
        shap_drivers = [
            {"feature": "Recent Fall", "value": "Yes", "shap_value": 8.5, "description": "Fall history"},
            {"feature": "SVI Index", "value": 0.85, "shap_value": 4.2, "description": "High social vulnerability"}
        ]
        
        result = EmailService.send_clinical_risk_alert(
            to_email="provider@example.com",
            provider_name="Dr. Sterling",
            member_id="mem-992",
            member_name="Eleanor Vance",
            member_code="EH-9923",
            age=74,
            gender="Female",
            risk_level="High",
            overall_score=87,
            shap_drivers=shap_drivers
        )
        
        self.assertTrue(result["success"])
        self.assertTrue(os.path.exists(result["file_path"]))
        
        with open(result["file_path"], "r", encoding="utf-8") as f:
            html = f.read()
            self.assertIn("Eleanor Vance", html)
            self.assertIn("Dr. Sterling", html)
            self.assertIn("EH-9923", html)
            self.assertIn("High Risk", html)
            self.assertIn("87/100", html)
            self.assertIn("Recent Fall", html)

    def test_send_intervention_reminder(self):
        """Test care intervention reminder rendering and mock output."""
        result = EmailService.send_intervention_reminder(
            to_email="coordinator@example.com",
            coordinator_name="Nurse Ratched",
            member_name="Arthur Pendelton",
            member_code="AP-002",
            intervention_title="Home Medication Review",
            category="Clinical Medication",
            due_date="2026-08-20",
            priority="Critical",
            description="Perform complete medication box alignment and vitals audit."
        )
        
        self.assertTrue(result["success"])
        self.assertTrue(os.path.exists(result["file_path"]))
        
        with open(result["file_path"], "r", encoding="utf-8") as f:
            html = f.read()
            self.assertIn("Nurse Ratched", html)
            self.assertIn("Arthur Pendelton", html)
            self.assertIn("Home Medication Review", html)
            self.assertIn("2026-08-20", html)
            self.assertIn("Critical", html)

    def test_send_weekly_cohort_digest(self):
        """Test cohort digest rendering and mock output."""
        flagged = [
            {"name": "Arthur Pendelton", "code": "AP-002", "score": 92, "level": "Very High", "barrier": "Transportation"},
            {"name": "Beatrice Sterling", "code": "BS-110", "score": 85, "level": "High", "barrier": "Food Instability"}
        ]
        
        result = EmailService.send_weekly_cohort_digest(
            to_email="coordinator@example.com",
            coordinator_name="Nurse Ratched",
            total_members=150,
            very_high_count=12,
            high_count=35,
            active_interventions=8,
            flagged_members=flagged
        )
        
        self.assertTrue(result["success"])
        self.assertTrue(os.path.exists(result["file_path"]))
        
        with open(result["file_path"], "r", encoding="utf-8") as f:
            html = f.read()
            self.assertIn("Nurse Ratched", html)
            self.assertIn("150", html)
            self.assertIn("12", html)
            self.assertIn("35", html)
            self.assertIn("Arthur Pendelton", html)
            self.assertIn("Beatrice Sterling", html)


class TestEmailRouter(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.test_dir = tempfile.mkdtemp()
        self.original_debug_mode = settings.debug_mode
        self.original_sent_emails_dir = settings.sent_emails_dir
        
        # Override configuration for route testing
        settings.debug_mode = True
        settings.sent_emails_dir = self.test_dir

    def tearDown(self):
        shutil.rmtree(self.test_dir)
        settings.debug_mode = self.original_debug_mode
        settings.sent_emails_dir = self.original_sent_emails_dir

    def test_get_root_endpoint(self):
        """Test main application status endpoint."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "online")

    def test_send_test_email_endpoint(self):
        """Test test email API routing."""
        payload = {
            "to_email": "tester@example.com",
            "subject": "Integration Test Subject",
            "body": "This is a body content."
        }
        response = self.client.post("/api/email/test", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["mode"], "mock")

    def test_send_risk_alert_endpoint(self):
        """Test risk alert API validation and routing."""
        payload = {
            "to_email": "provider@example.com",
            "provider_name": "Dr. Sterling",
            "member_id": "mem-1",
            "member_name": "Eleanor Vance",
            "member_code": "EV-001",
            "age": 74,
            "gender": "Female",
            "risk_level": "High",
            "overall_score": 85,
            "shap_drivers": [
                {"feature": "Fall History", "value": "Yes", "shap_value": 6.8}
            ]
        }
        # In endpoint testing, background tasks run after response returns.
        # We want to check status is queued.
        response = self.client.post("/api/email/alert/risk", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "queued")

    def test_send_weekly_digest_endpoint(self):
        """Test weekly digest API validation and routing with attachments option."""
        payload = {
            "to_email": "coord@example.com",
            "coordinator_name": "Nurse Ratched",
            "total_members": 200,
            "very_high_count": 5,
            "high_count": 12,
            "active_interventions": 10,
            "flagged_members": [
                {
                    "name": "Beatrice Sterling",
                    "code": "BS-110",
                    "score": 90,
                    "level": "Very High",
                    "barrier": "Food Instability"
                }
            ],
            "attach_report": True
        }
        response = self.client.post("/api/email/digest", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "queued")

    def test_get_sent_logs_endpoint(self):
        """Test fetching log history of mock sent emails."""
        # Call test endpoint once to write a log
        self.client.post("/api/email/test", json={
            "to_email": "tester@example.com",
            "subject": "Logged Test Subject",
            "body": "Content"
        })
        
        response = self.client.get("/api/email/sent-logs")
        self.assertEqual(response.status_code, 200)
        logs = response.json()
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["to"], "tester@example.com")
        self.assertEqual(logs[0]["subject"], "Logged Test Subject")


if __name__ == "__main__":
    unittest.main()
