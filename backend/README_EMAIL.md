# UC09 — Intervention Email Notification

## Overview

This work adds an email notification workflow to the UC09 Member Risk intervention system.

When a **new intervention recommendation** is generated for a member, the system:

1. Generates intervention recommendations using the existing RAG/Gemini workflow.
2. Saves the intervention to the database.
3. Creates an `EmailNotification` record.
4. Sends the intervention details to the configured Payer Viewer email.
5. Updates the email notification status to `SENT` or `FAILED`.

The intervention is committed **before** the email is sent. Therefore, an email failure does not remove the saved intervention.

---

## Email Workflow

```text
GET /recommendations/{member_id}
            |
            v
     Find Member
            |
            v
   Find Latest Prediction
            |
            v
 Existing RAG Intervention?
       /           \
     YES            NO
      |              |
      v              v
 Return Existing   Generate RAG
 Intervention      Recommendations
                       |
                       v
                Create Intervention
                       |
                       v
                  DB COMMIT
                       |
                       v
             Create EmailNotification
                       |
                       v
              Send Intervention Email
                  /          \
               SENT          FAILED
                |               |
                v               v
        Update SENT       Update FAILED
                \               /
                 \             /
                  v           v
                    Return API
```

---

# Files Changed

## 1. Email Service

Location:

```text
backend/app/services/email_notification/service.py
```

This file contains the actual SMTP email implementation.

The main function used by the intervention workflow is:

```python
send_intervention_email(intervention)
```

The service is responsible for:

* Loading SMTP configuration.
* Validating email configuration.
* Building the intervention email.
* Sending the email using Gmail SMTP.
* Handling SMTP authentication errors.
* Handling SMTP connection errors.
* Providing a test email function.

---

## 2. Intervention Service

Location:

```text
backend/app/services/intervention_service.py
```

The main function is:

```python
get_or_generate_recommendations(member_id)
```

This service connects the intervention generation workflow with email notification.

### New Intervention Flow

When no intervention exists for the latest prediction:

```python
generate_recommendations_for_member(member_id)
```

is called.

The generated recommendations are then stored in:

```text
Intervention
```

The intervention is committed:

```python
db.commit()
db.refresh(intervention)
```

Only after this successful commit does the email workflow begin.

---

# Email Notification Database Record

After the intervention is committed, an `EmailNotification` record is created.

Example:

```python
email_notification = EmailNotification(
    member_id=member.id,
    recipient_email=recipient_email,
    subject=email_subject,
    notification_type="NEW_INTERVENTION",
    status="PENDING",
)
```

The notification is committed before the email is sent.

---

# Email Status Handling

The email notification supports the following workflow:

```text
PENDING
   |
   +----> SENT
   |
   +----> FAILED
```

## Successful Email

If the email is sent successfully:

```python
email_notification.status = "SENT"
```

and:

```python
email_notification.sent_at = datetime.now(timezone.utc)
```

is recorded.

---

## Failed Email

If sending fails:

```python
email_notification.status = "FAILED"
```

and the error is stored:

```python
email_notification.error_message = str(exc)
```

The intervention itself remains saved in the database.

---

# Important Behavior

## No Duplicate Email for Existing Intervention

If an intervention already exists for the latest prediction:

```text
Existing Intervention
        |
        v
Return existing intervention
```

The service does **not**:

* Generate RAG recommendations again.
* Create another intervention.
* Automatically send another email.

This prevents duplicate intervention emails.

---

# Email Content

The intervention email contains information already present in the generated intervention result.

The email can contain:

* Member ID
* Intervention ID
* Prediction ID
* Risk Score
* Risk Category
* Risk Summary
* Recommendation priority
* Feature
* Concept
* Rationale
* Recommended Action
* Next Step

No additional clinical information is invented by the email service.

---

# Email Subject

The subject follows this format:

```text
New Member Intervention - <member_id> - <risk_category> Risk
```

Example:

```text
New Member Intervention - M001 - HIGH Risk
```

---

# Gmail SMTP Configuration

The email service uses Gmail SMTP.

Default configuration:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

The following environment variables are required:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail-address
SMTP_PASSWORD=your-gmail-app-password
PAYER_VIEWER_EMAIL=payer-viewer@example.com
```

## Important

For Gmail authentication, use a **Gmail App Password**.

Do not use the normal Gmail account password.

Do not commit the `.env` file to Git.

---

# SMTP Connection

The service uses:

```python
smtplib.SMTP(
    SMTP_HOST,
    SMTP_PORT,
    timeout=30,
)
```

The connection uses STARTTLS:

```python
server.ehlo()
server.starttls()
server.ehlo()
```

Then Gmail authentication is performed:

```python
server.login(
    SMTP_USERNAME,
    SMTP_PASSWORD,
)
```

Finally:

```python
server.send_message(message)
```

sends the notification.

---

# Email Configuration Validation

Before sending an email, the service checks:

```text
SMTP_USERNAME
SMTP_PASSWORD
PAYER_VIEWER_EMAIL
```

If any required configuration is missing, the service raises:

```text
Email configuration is incomplete.
```

This prevents the application from attempting an SMTP connection with incomplete configuration.

---

# Test Email

The email service provides:

```python
send_test_email()
```

This can be used to verify the Gmail SMTP configuration independently of the intervention workflow.

From the backend directory:

```powershell
python -c "from app.services.email_notification.service import send_test_email; send_test_email(); print('TEST EMAIL SENT')"
```

If the configuration is correct, the configured Payer Viewer should receive the test email.

---

# Validate Email Service Import

From:

```text
UC09-MEMBER-RISK\backend
```

run:

```powershell
python -c "from app.services.email_notification.service import send_intervention_email; print('EMAIL SERVICE OK')"
```

Expected:

```text
EMAIL SERVICE OK
```

---

# Validate Intervention Service

Run:

```powershell
python -c "from app.services.intervention_service import get_or_generate_recommendations; print('INTERVENTION SERVICE OK')"
```

Expected:

```text
INTERVENTION SERVICE OK
```

---

# Validate Complete Application

Run:

```powershell
python -c "from app.main import app; print('MAIN APP OK')"
```

Expected:

```text
MAIN APP OK
```

---

# Run Backend

From:

```text
UC09-MEMBER-RISK\backend
```

run:

```powershell
uvicorn app.main:app --reload
```

The API will run at:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

---

# API Testing Flow

The complete email workflow should be tested in this order.

## Step 1 — Start Backend

```powershell
uvicorn app.main:app --reload
```

## Step 2 — Generate Prediction

Use the existing prediction API for a valid member.

```text
POST /predict
```

The member must have a valid risk prediction before recommendations are generated.

## Step 3 — Generate Recommendation

Call:

```text
GET /recommendations/{member_id}
```

The service will:

```text
Member
  ↓
Latest RiskPrediction
  ↓
Check Intervention
  ↓
Generate Recommendation
  ↓
Save Intervention
  ↓
Create EmailNotification
  ↓
Send Email
```

## Step 4 — Check API Response

A successful response contains information similar to:

```json
{
  "member_id": "M001",
  "risk_summary": {},
  "recommendations": [],
  "source": "RAG",
  "status": "PENDING",
  "intervention_id": 1,
  "prediction_id": 10,
  "email_notification": {
    "notification_id": 1,
    "recipient": "payer-viewer@example.com",
    "status": "SENT",
    "error": null
  }
}
```

The exact response depends on the current database records and recommendation result.

---

# Manual Intervention Notification

An existing intervention can also be notified through:

```text
POST /interventions/{intervention_id}/notify
```

This endpoint uses the persisted intervention instead of generating a new recommendation.

It is protected by the intervention access permission.

Allowed roles are determined by:

```text
app/security/permissions.py
```

The endpoint creates an `EmailNotification` record and sends the existing intervention recommendations to the configured Payer Viewer.

---

# Error Handling

## SMTP Authentication Failure

If Gmail authentication fails, the email service raises a clear SMTP authentication error.

Check:

```text
SMTP_USERNAME
SMTP_PASSWORD
```

and verify that the password is a Gmail App Password.

---

## SMTP Connection Failure

If the SMTP server cannot be reached, the service reports the SMTP host and port connection failure.

Default:

```text
smtp.gmail.com:587
```

---

## Missing Payer Viewer Email

If:

```text
PAYER_VIEWER_EMAIL
```

is missing, email configuration validation fails.

Configure it in `.env`.

---

# Important Implementation Rule

The following order must not be changed:

```text
Create Intervention
        ↓
DB COMMIT
        ↓
Create EmailNotification
        ↓
Send Email
        ↓
Update EmailNotification status
```

The email should **not** be sent before the intervention is successfully committed.

This guarantees that an email notification never refers to an intervention that failed to persist.

---

# Git Branch

The email notification work should be isolated in a feature branch.

Recommended branch:

```text
feature/uc09-intervention-email
```

Create it from the latest `develop`:

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/uc09-intervention-email
```

---

# Commit

Review the changes:

```powershell
git status
git diff
```

Then commit:

```powershell
git add .
git commit -m "feat: add intervention email notification workflow"
```

---

# Push

Push the feature branch:

```powershell
git push -u origin feature/uc09-intervention-email
```

Create a Pull Request:

```text
feature/uc09-intervention-email
             |
             v
          develop
```

After review and approval, merge the Pull Request into `develop`.

Then update the local `develop` branch:

```powershell
git checkout develop
git pull origin develop
```

---

# Implementation Result

This implementation provides a complete intervention email notification workflow:

```text
Risk Prediction
      ↓
RAG Recommendation
      ↓
Intervention
      ↓
Database Commit
      ↓
EmailNotification
      ↓
Gmail SMTP
      ↓
Payer Viewer
```

The database maintains the email delivery state using:

```text
PENDING
SENT
FAILED
```

while preserving the intervention even when email delivery fails.
