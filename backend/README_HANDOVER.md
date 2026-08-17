# UC09 Member Risk Backend — Handover Guide

## 1. Purpose

This document is the technical handover for the backend work completed so far for the **UC09 Member Risk** application.

The scope covered here is everything completed **apart from the ML model implementation itself**. The ML pipeline/model is already completed and integrated through the existing prediction/risk services.

The backend is currently prepared for the next development phases:

1. **RAG intervention integration**
2. **Frontend integration**

---

# 2. Current Status

| Component | Status |
|---|---|
| FastAPI backend | ✅ Complete |
| PostgreSQL connection | ✅ Complete |
| SQLAlchemy ORM models | ✅ Complete |
| User registration/authentication | ✅ Complete |
| JWT authentication | ✅ Complete |
| Role-based access control (RBAC) | ✅ Complete |
| Default registration role | ✅ `payer_viewer` |
| Prediction API authorization | ✅ Complete |
| CSV upload validation | ✅ Complete |
| 15 MB upload limit | ✅ Complete |
| 50,000-row limit | ✅ Complete |
| Members persistence | ✅ Complete |
| Risk prediction persistence | ✅ Complete |
| SHAP persistence | ✅ Complete |
| Intervention persistence structure | ✅ Complete |
| Email notification persistence structure | ✅ Complete |
| API/service/database integration | ✅ Complete |
| Authentication/security tests | ✅ Complete |
| Database tests | ✅ Complete |
| ML implementation | ✅ Already completed separately |
| RAG implementation | 🔜 Next phase |
| Frontend integration | 🔜 Next phase |

The backend API/security/database layer is considered ready for handover.

---

# 3. Project Structure

The relevant backend structure is:

```text
backend/
│
├── app/
│   ├── api/
│   │   ├── auth.py
│   │   ├── member.py
│   │   └── prediction.py
│   │
│   ├── database/
│   │   ├── connection.py
│   │   ├── crud.py
│   │   └── models.py
│   │
│   ├── security/
│   │   └── ...
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── prediction_service.py
│   │   ├── risk_service.py
│   │   ├── shap_service.py
│   │   ├── intervention_service.py
│   │   └── email.py
│   │
│   └── main.py
│
├── tests/
│   ├── test_auth.py
│   ├── test_database.py
│   ├── test_jwt.py
│   ├── test_permissions.py
│   └── test_user_auth.py
│
├── requirements.txt
└── README_SECURITY.md
```

Do not move or rename the existing security/service modules without checking their imports in the API layer.

---

# 4. Authentication

Authentication is implemented using JWT.

The basic flow is:

```text
User
  ↓
Register/Login
  ↓
Password verification
  ↓
JWT generated
  ↓
Client stores token
  ↓
Client sends:
Authorization: Bearer <JWT>
  ↓
FastAPI security dependency
  ↓
Current user resolved
  ↓
Role/permission checked
  ↓
API executes
```

Passwords are not stored as plaintext. The `users` table stores a password hash.

---

# 5. User Roles

The application uses role-based access control.

The important roles currently used by the backend are:

```text
payer_admin
clinical_analyst
care_manager
payer_viewer
```

New users are registered with:

```text
payer_viewer
```

unless the registration flow explicitly assigns another permitted role.

This is intentional: normal registration must not allow an arbitrary client to create an administrative user.

---

# 6. Prediction Permission

The prediction endpoint uses the existing permission dependency:

```python
require_prediction_access()
```

The intended access is:

```text
payer_admin       → allowed
clinical_analyst  → allowed
care_manager      → allowed
payer_viewer      → denied
```

Therefore a user with the default `payer_viewer` role will receive:

```text
403 Forbidden
Insufficient permissions
```

when attempting to execute the prediction operation.

This behavior has already been tested.

---

# 7. Database

PostgreSQL is used as the backend database.

SQLAlchemy is used for ORM/database access.

The main database tables are:

```text
users
members
risk_predictions
shap_explanations
interventions
email_notifications
```

The database connection is configured in:

```text
app/database/connection.py
```

The ORM models are defined in:

```text
app/database/models.py
```

CRUD/database helper functions are in:

```text
app/database/crud.py
```

---

# 8. Database Relationships

The main relationship is:

```text
members
   │
   ├── risk_predictions
   │
   ├── shap_explanations
   │
   ├── interventions
   │
   └── email_notifications
```

A member can therefore have multiple prediction/explanation/intervention/notification records over time.

The database schema has already been created and verified.

---

# 9. Important Member ID Detail

There are two different identifiers involved.

## Internal database ID

Example:

```text
members.id = 1
```

This is the PostgreSQL primary key.

## Business/member identifier

Example:

```text
members.member_id = M00001
```

This is the actual member identifier coming from the member dataset.

They are intentionally different.

For example:

```text
members
--------------------------------
id          member_id
1           M00001
2           M00002
3           M00003
```

Other tables currently use the internal database ID for their foreign-key relationship.

For example:

```text
risk_predictions.member_id = 1
```

means:

```text
risk_predictions.member_id
        ↓
members.id
        ↓
members.member_id = M00001
```

Do not change this relationship casually. It is a normal relational design where the foreign key references the internal primary key.

---

# 10. Members Table

The `members` table stores the member information received from the CSV.

It includes:

- Member identifier
- Demographic information
- Geographic identifiers
- Clinical information
- Healthcare utilization
- Care-gap information
- SVI fields
- CDC PLACES fields
- USDA food-access fields
- Created/updated timestamps

The purpose is to persist the actual member record instead of keeping the uploaded CSV data only in memory.

---

# 11. Risk Predictions Table

The `risk_predictions` table stores ML prediction results.

Important fields include:

```text
id
member_id
risk_score
risk_category
model_version
created_by
created_at
```

The prediction record is linked to the corresponding member.

The `created_by` field can identify the authenticated user who initiated the prediction operation.

---

# 12. SHAP Explanations Table

The `shap_explanations` table stores the explanation generated from the existing ML/SHAP pipeline.

Important fields:

```text
id
member_id
prediction_id
top_risk_drivers
created_at
```

`top_risk_drivers` is stored as JSON.

The existing SHAP implementation is in:

```text
app/services/shap_service.py
```

The ML/SHAP implementation itself is considered completed and should not be rewritten unless required by a future integration issue.

---

# 13. Intervention Table — RAG Handover

The `interventions` table is already prepared for the RAG layer.

Important fields:

```text
id
member_id
prediction_id
intervention_priority
recommendations
source
status
assigned_to
created_at
completed_at
```

The intended source is:

```text
RAG
```

The intended flow is:

```text
Risk Prediction
      +
SHAP Risk Drivers
      ↓
RAG
      ↓
Intervention Recommendation
      ↓
interventions table
```

The RAG layer should generate recommendations based on the available member/risk/explanation context.

Do not create a second intervention storage model unless there is a specific requirement.

The existing table is intended to be the persistence point for RAG-generated interventions.

---

# 14. Email Notifications

The `email_notifications` table stores notification history.

Important fields include:

```text
id
member_id
recipient_email
subject
notification_type
status
error_message
sent_at
created_at
```

The current table is designed to support future notification functionality.

The email service can be implemented/connected later without changing the existing member/risk data model.

---

# 15. Prediction API

The main prediction API is:

```text
POST /predict/
```

It accepts a CSV upload.

The endpoint performs security and input validation before calling the existing ML service.

The high-level flow is:

```text
POST /predict/
       ↓
JWT authentication
       ↓
RBAC permission check
       ↓
CSV validation
       ↓
Pandas DataFrame
       ↓
Existing preprocessing/ML service
       ↓
Prediction result
       ↓
Database persistence
       ↓
SHAP persistence
       ↓
Response
```

---

# 16. CSV Validation

The prediction API currently validates:

### File extension

Only `.csv` files are accepted.

### File size

Maximum:

```text
15 MB
```

Configured as:

```python
MAX_FILE_SIZE = 15 * 1024 * 1024
```

### Row count

Maximum:

```text
50,000 rows
```

Configured as:

```python
MAX_ROWS = 50_000
```

### Empty files

Empty uploads are rejected.

### Empty datasets

A CSV with headers but no data rows is rejected.

### Invalid CSV

Parsing errors result in a client error rather than silently passing invalid data into the ML layer.

---

# 17. Do Not Bypass the Service Layer

The API should not contain the ML implementation itself.

The intended architecture is:

```text
API
 ↓
Service
 ↓
Preprocessing
 ↓
ML
 ↓
SHAP
 ↓
Persistence
```

The existing ML implementation is already available through the service layer.

Future RAG code should follow the same principle:

```text
API
 ↓
RAG service
 ↓
RAG/retrieval/generation logic
 ↓
Intervention persistence
```

Do not place the RAG implementation directly inside `app/api/prediction.py`.

---

# 18. CRUD Layer

Database helper functions are located in:

```text
app/database/crud.py
```

Current user-related operations include:

```text
get_user_by_username()
get_user_by_email()
get_user_by_id()
create_user()
```

The CRUD layer should remain responsible for database access.

When adding RAG persistence operations, prefer adding appropriate CRUD/service functions rather than embedding SQLAlchemy queries throughout API routes.

---

# 19. Security Layer

The security implementation is under:

```text
app/security/
```

The security layer is responsible for:

- JWT handling
- Authentication dependencies
- Current-user resolution
- Role validation
- Permission checks
- Protected endpoint access

The security layer should remain centralized.

If a new API endpoint is added, protect it through the existing security dependency pattern rather than implementing custom token parsing in the route.

---

# 20. API Main Application

Application setup is in:

```text
app/main.py
```

This is where FastAPI is initialized and API routers are registered.

When adding new RAG routes, register a dedicated router rather than adding all RAG functionality to the prediction route.

For example, a future structure could be:

```text
app/api/
    auth.py
    member.py
    prediction.py
    intervention.py
```

if the RAG/intervention API requires separate endpoints.

---

# 21. Testing

The following tests have already been created:

```text
tests/test_auth.py
tests/test_database.py
tests/test_jwt.py
tests/test_permissions.py
tests/test_user_auth.py
```

Database test:

```powershell
python tests/test_database.py
```

Other tests can be run individually:

```powershell
python tests/test_jwt.py
python tests/test_permissions.py
python tests/test_user_auth.py
python tests/test_auth.py
```

Before modifying the security layer, run the existing tests to establish a baseline.

---

# 22. Database Verification

A useful command for checking the current schema is:

```powershell
python -c "from app.database.connection import engine; from sqlalchemy import inspect; i=inspect(engine); print(i.get_table_names())"
```

Expected tables:

```text
users
members
risk_predictions
email_notifications
shap_explanations
interventions
```

To inspect columns:

```powershell
python -c "from app.database.connection import engine; from sqlalchemy import inspect; i=inspect(engine); [print('\n'+t, '->', [c['name'] for c in i.get_columns(t)]) for t in ['risk_predictions','shap_explanations','interventions','email_notifications']]"
```

---

# 23. Running the Backend

Run the application from the directory where the `app` package is importable.

Expected command:

```powershell
python -m uvicorn app.main:app --reload
```

Expected local URL:

```text
http://127.0.0.1:8000
```

Swagger/OpenAPI is available through the FastAPI documentation endpoint when the server is running.

If you receive:

```text
ModuleNotFoundError: No module named 'app'
```

check that you are running the command from the correct project directory containing the `app` package.

---



# 23A. How to Set Up and Run the Backend

This section is the quickest way for the next developer to get the existing backend running locally.

## Prerequisites

Install/verify:

- Python 3.11
- PostgreSQL
- Git

From PowerShell:

```powershell
python --version
psql --version
git --version
```

The project currently uses the Python `app` package, so commands that import `app.*` must be run from the backend directory containing the `app` folder.

## 1. Open the backend directory

Example:

```powershell
cd C:\Users\<your-user>\SIH-3\UC09-MEMBER-RISK\backend
```

Verify:

```powershell
Get-ChildItem
```

You should see the `app` directory and `requirements.txt`.

## 2. Create/activate a virtual environment

If a virtual environment does not already exist:

```powershell
python -m venv .venv
```

Activate it:

```powershell
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks script execution for the current user, use the team's approved Python environment or configure the execution policy according to your organization's standards. Do not disable security controls globally just to run the project.

Verify:

```powershell
python --version
```

## 3. Install dependencies

Run:

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If dependencies were changed, reinstall from `requirements.txt` before debugging application-level errors.

## 4. Configure PostgreSQL

Create/use the PostgreSQL database expected by the application.

Then configure the database connection using the configuration expected by:

```text
app/database/connection.py
```

Do not hard-code database passwords or secrets into Python files.

If the project uses environment variables, configure them in the local environment/`.env` mechanism already expected by the repository.

Do not commit:

```text
.env
database passwords
JWT secrets
API keys
email credentials
real access tokens
```

to Git.

## 5. Verify the database connection and tables

Run:

```powershell
python tests/test_database.py
```

A successful run should report that the PostgreSQL connection succeeds and the database tables are created/verified.

The expected tables are:

```text
users
members
risk_predictions
email_notifications
shap_explanations
interventions
```

You can also inspect the tables directly:

```powershell
python -c "from app.database.connection import engine; from sqlalchemy import inspect; i=inspect(engine); print(i.get_table_names())"
```

## 6. Start FastAPI

From the `backend` directory:

```powershell
python -m uvicorn app.main:app --reload
```

Expected output is similar to:

```text
Uvicorn running on http://127.0.0.1:8000
```

Keep this terminal running.

If you see:

```text
ModuleNotFoundError: No module named 'app'
```

you are most likely running Uvicorn from the wrong directory.

Run:

```powershell
Get-ChildItem app
```

and confirm that the current directory contains the `app` package. Then run:

```powershell
python -m uvicorn app.main:app --reload
```

again.

## 7. Open the API documentation

With the server running, open the local FastAPI Swagger documentation in a browser:

```text
http://127.0.0.1:8000/docs
```

The OpenAPI schema is normally available at:

```text
http://127.0.0.1:8000/openapi.json
```

Use Swagger for initial API verification before connecting the frontend.

## 8. Test authentication

Run the existing authentication/security tests:

```powershell
python tests/test_auth.py
python tests/test_jwt.py
python tests/test_permissions.py
python tests/test_user_auth.py
```

A newly registered user normally receives:

```text
payer_viewer
```

as the default role.

The prediction endpoint intentionally requires a role with prediction access, so a default `payer_viewer` should receive:

```text
403 Forbidden
```

with:

```json
{
  "detail": "Insufficient permissions"
}
```

This is expected behavior, not an application failure.

## 9. Test the prediction API

Once an authorized test user/token is available, use Swagger or PowerShell/cURL to call:

```text
POST /predict/
```

The request is a multipart form upload containing the CSV.

Example PowerShell/cURL structure:

```powershell
curl.exe -X POST `
  "http://127.0.0.1:8000/predict/" `
  -H "accept: application/json" `
  -H "Authorization: Bearer <JWT_TOKEN>" `
  -F "file=@UC09_FINAL_MEMBER_RISK_DATASET.csv;type=text/csv"
```

Replace:

```text
<JWT_TOKEN>
```

with a locally generated test token.

Do not paste real production tokens into documentation, Git commits, screenshots, or team chat.

The prediction API enforces:

```text
CSV only
15 MB maximum file size
50,000 maximum rows
non-empty file
non-empty dataset
authenticated user
required prediction role
```

## 10. Verify persisted data

After a successful prediction, verify that the expected records are present in:

```text
members
risk_predictions
shap_explanations
```

The intervention table is already prepared for the next RAG phase:

```text
interventions
```

RAG-generated recommendations should be persisted there rather than introducing a second intervention table.

## 11. Run the complete existing test set

From the backend directory:

```powershell
python tests/test_database.py
python tests/test_auth.py
python tests/test_jwt.py
python tests/test_permissions.py
python tests/test_user_auth.py
```

If the repository is later converted to a pytest-driven suite, the team can additionally run:

```powershell
pytest
```

Do not assume `pytest` is the current source of truth unless the repository's test configuration confirms it; the existing tests are currently runnable directly with Python as shown above.

## 12. Typical local development workflow

Use two PowerShell terminals.

### Terminal 1 — backend

```powershell
cd C:\Users\<your-user>\SIH-3\UC09-MEMBER-RISK\backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

### Terminal 2 — tests/API verification

```powershell
cd C:\Users\<your-user>\SIH-3\UC09-MEMBER-RISK\backend
.\.venv\Scripts\Activate.ps1
python tests/test_database.py
```

Then use:

```text
http://127.0.0.1:8000/docs
```

to exercise the APIs.

## 13. Before starting RAG development

Confirm:

```text
PostgreSQL → connected
FastAPI → running
Authentication → working
JWT → working
RBAC → working
Prediction permission → working
Prediction API → working
members → populated
risk_predictions → populated
shap_explanations → populated
interventions table → available
```

Then begin RAG implementation.

The RAG developer should not need to modify the JWT/RBAC layer merely to integrate interventions.


# 24. Authentication Testing

A protected request requires:

```http
Authorization: Bearer <JWT>
```

Example structure:

```text
Authorization: Bearer eyJ...
```

Do not commit real JWT tokens, passwords, database credentials, or `.env` files to Git.

---

# 25. Expected Permission Behavior

A default `payer_viewer` should not be able to call prediction operations requiring elevated permissions.

Expected response:

```json
{
  "detail": "Insufficient permissions"
}
```

with HTTP:

```text
403
```

An authorized role such as:

```text
payer_admin
clinical_analyst
care_manager
```

can proceed to the prediction layer when the endpoint requires prediction access.

---

# 26. Important Development Rule

The security layer is already integrated.

Do not replace:

```text
JWT
+
RBAC
+
permission dependencies
```

with frontend-only role checks.

The frontend may use role information to control the UI, but the backend must continue enforcing authorization.

---

# 27. Recommended RAG Integration

The next developer should integrate RAG without disturbing the existing ML pipeline.

Recommended flow:

```text
                    ┌──────────────────┐
CSV ───────────────►│ Prediction API   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Preprocessing/ML │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Risk Prediction  │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    ▼                  ▼
             Risk Prediction         SHAP
                    │                  │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │       RAG        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Intervention    │
                    │  Recommendation  │
                    └────────┬─────────┘
                             │
                             ▼
                    interventions
```

The RAG developer should consume the relevant risk and SHAP context and write the resulting intervention information to the existing `interventions` table.

---

# 28. Recommended Frontend Integration

The frontend should integrate with the backend through HTTP APIs.

Authentication flow:

```text
Frontend
   ↓
Login/Register API
   ↓
JWT
   ↓
Frontend stores token appropriately
   ↓
Authorization header
   ↓
Protected FastAPI endpoint
```

For protected requests:

```http
Authorization: Bearer <JWT>
```

The frontend should be aware of the user's role for UI behavior.

However:

```text
Frontend role check ≠ backend authorization
```

Backend RBAC remains authoritative.

---

# 29. Suggested Frontend Screens

The current backend structure supports the following future frontend areas:

### Authentication

- Login
- Registration
- Session/token handling

### Member

- Member list
- Member details
- Member risk history

### Prediction

- CSV upload
- Prediction execution
- Risk score
- Risk category
- Prediction history

### Explainability

- SHAP risk drivers
- Risk-driver details

### Intervention

- RAG recommendations
- Intervention priority
- Intervention status
- Assignment
- Completion

### Notifications

- Email notification status/history

---

# 30. What the Next Developer Should NOT Redesign

The following pieces are already established:

```text
PostgreSQL
SQLAlchemy models
users table
members table
risk_predictions table
shap_explanations table
interventions table
email_notifications table
JWT authentication
RBAC
prediction permission dependency
CSV validation limits
member relationships
prediction persistence structure
SHAP persistence structure
```

Do not redesign these unless a concrete requirement requires it.

---

# 31. Recommended Next Tasks

## Phase 1 — RAG

1. Implement the RAG service.
2. Define the RAG input contract.
3. Use risk prediction + SHAP drivers as RAG context.
4. Generate intervention recommendations.
5. Store recommendations in `interventions`.
6. Set intervention priority.
7. Set intervention status.
8. Preserve `source="RAG"`.
9. Add RAG service tests.
10. Add API tests for intervention endpoints if new endpoints are introduced.

## Phase 2 — Frontend

1. Connect login.
2. Connect registration.
3. Add JWT authorization handling.
4. Implement role-aware UI.
5. Connect member APIs.
6. Connect prediction upload.
7. Display risk results.
8. Display SHAP explanations.
9. Display RAG interventions.
10. Add intervention status/assignment UI.
11. Integrate notification status where required.

---

# 32. Git Branch

The completed work is being developed on:

```text
feature/backend-api-integration
```

The current changes should be committed and pushed from this feature branch.

Recommended commit style:

```text
Complete backend API security and persistence integration
```

The next developer should create their work from the agreed team branch after the backend integration PR is merged.

---

# 33. Handover Checklist

Before considering this phase complete:

- [x] FastAPI configured
- [x] PostgreSQL connected
- [x] SQLAlchemy models created
- [x] User authentication implemented
- [x] JWT implemented
- [x] RBAC implemented
- [x] Default role set to `payer_viewer`
- [x] Prediction permissions enforced
- [x] CSV validation implemented
- [x] 15 MB file limit implemented
- [x] 50,000-row limit implemented
- [x] Member information persisted
- [x] Risk predictions persisted
- [x] SHAP explanations persisted
- [x] Intervention table prepared for RAG
- [x] Email notification table prepared
- [x] Database relationships verified
- [x] Authentication/security tests created
- [x] Database tests created
- [x] Prediction API tested
- [x] ML implementation already completed separately

Next:

- [ ] RAG implementation
- [ ] RAG → intervention persistence
- [ ] Intervention APIs if required
- [ ] Frontend integration
- [ ] End-to-end integration testing

---

# 34. Final Handover Summary

The backend API integration, authentication, authorization, database layer, member persistence, prediction persistence, SHAP persistence, CSV validation, and test foundation are complete.

The ML implementation is already completed separately and should be treated as an existing dependency.

The backend is now ready for:

```text
                 CURRENT
                    │
                    ▼
        Backend API + Security
                    │
                    ▼
              PostgreSQL
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
         ML                  SHAP
          │                   │
          └─────────┬─────────┘
                    ▼
             READY FOR RAG
                    │
                    ▼
            Intervention Data
                    │
                    ▼
          READY FOR FRONTEND
```

The next developer should extend the existing architecture rather than replace it.

**Primary goal for the next phase: integrate RAG-generated interventions into the existing `interventions` persistence flow and expose the required APIs for frontend consumption.**
