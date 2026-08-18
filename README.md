# CareRiskPulse (UC09-MEMBER-RISK)
### Social Determinants of Health (SDOH) & Clinical Risk Analytics Decision Support Platform

---

## 📌 Executive Summary

**CareRiskPulse** is an enterprise-grade Clinical Decision Support System (CDSS) and Population Health Analytics platform designed for healthcare payers, health systems, care managers, and clinical analysts. 

The platform bridges clinical diagnoses with county-level Social Determinants of Health (SDOH) to identify rising-risk members, explain specific physiological and socio-economic drivers using Explainable AI (SHAP), and formulate evidence-grounded care interventions through a hybrid **Retrieval-Augmented Generation (RAG)** engine powered by FAISS vector search and Google Gemini.

---

## 🌟 Key Capabilities

### 1. 🤖 Calibrated Ensemble Risk Prediction
- **Model Architecture**: Ensemble stacking classifier utilizing **XGBoost**, **LightGBM**, **CatBoost**, and **Random Forest** with a calibrated Logistic Regression meta-learner.
- **Stratification**: Classifies members into 4 standardized risk tiers:
  - 🟣 **Very High Risk** ($\ge 75$) &mdash; Immediate clinical intervention priority.
  - 🔴 **High Risk** ($55 - 74$) &mdash; Proactive care management queue.
  - 🟡 **Medium Risk** ($30 - 54$) &mdash; Preventive tracking and SDOH support.
  - 🟢 **Low Risk** ($< 30$) &mdash; Routine annual monitoring.

### 2. 🔍 Explainable AI (SHAP Attribution)
- Integrates `TreeExplainer` to compute exact additive feature contributions for every member prediction.
- Visualizes top individual risk drivers (e.g., emergency department utilization, chronic condition count, food access barrier, transportation distress, housing burden) with positive/negative force impacts.

### 3. 🧠 Grounded RAG Decision Support Engine
- **Vector Retrieval**: Domain-specific **FAISS** vector store indexing medical guidelines (AHRQ, USPSTF, CDC PLACES, USDA Food Access).
- **Clinical Synthesis**: **Google Gemini** LLM synthesizes structured, actionable care protocols:
  - Protocol Title & Domain categorization.
  - Priority Badge (High, Medium, Standard).
  - Target Risk Driver & SHAP Impact score.
  - Clinical & SDOH Rationale (*Why this is recommended*).
  - Recommended Action Plan (*What action to take*).
  - Next Steps (*Follow-up timeframe and clinical pathway*).
  - Supporting Medical & SDOH Evidence citations with vector similarity scores.

### 4. 📬 Automated Non-Blocking Email Notifications
- Automatically sends structured HTML and plain-text clinical alert emails to `PAYER_VIEWER_EMAIL` upon successful recommendation generation.
- **Smart Cache**: Identifies existing predictions to eliminate redundant RAG calls and prevent duplicate emails on page refreshes.
- **Fail-Safe Resilience**: Any SMTP communication failure is logged and recorded in the database without disrupting the API or degrading user response times.

### 5. 🗺️ Geographic SDOH & Interactive US County Map
- D3 and TopoJSON county-level choropleth map aggregating cohort member risk by 5-digit county FIPS codes.
- Features smooth zoom, pan, tooltip inspections, and cohort filtering.

### 6. 📄 Natural-Language PDF Intervention Export
- In-browser multi-page PDF generation via `jsPDF`.
- Exports branded, clinical-ready intervention reports complete with member demographics, risk tiers, protocol cards, rationales, action plans, and literature citations.

### 7. 🔐 Role-Based Access Control (RBAC) & Dynamic Token Lifecycle
- JWT Bearer Authentication with secure Argon2/Bcrypt password hashing.
- Four distinct organizational roles with strict server-enforced access boundaries.
- Dynamic administrative role assignment (`PATCH /auth/users/{id}/role`) with immediate token re-issuance and permission synchronization.

---

## 👥 RBAC Permission Matrix

| Feature / Action | `payer_viewer` | `clinical_analyst` | `care_manager` | `payer_admin` |
| :--- | :---: | :---: | :---: | :---: |
| **View Dashboard & Population Metrics** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Browse Member Registry & View Details** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Inspect SHAP Drivers & SDOH Insights** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Trigger Grounded RAG Interventions** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Download PDF Intervention Reports** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Upload / Ingest Cohort CSV (`/predict/`)** | ❌ Denied (403) | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Manual Care Intervention CRUD** | ❌ Denied (403) | ❌ Denied (403) | ✅ Allowed | ✅ Allowed |
| **Admin User Management (`/auth/users`)** | ❌ Denied (403) | ❌ Denied (403) | ❌ Denied (403) | ✅ Allowed |
| **Modify User Roles (`PATCH /role`)** | ❌ Denied (403) | ❌ Denied (403) | ❌ Denied (403) | ✅ Allowed |

---

## 🛠️ Technology Stack

### Backend
- **Framework**: Python 3.10+ / [FastAPI](https://fastapi.tiangolo.com/) (Asynchronous REST API)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [SQLAlchemy](https://www.sqlalchemy.org/) ORM
- **ML / AI**: Scikit-Learn, LightGBM, XGBoost, CatBoost, SHAP, Joblib
- **RAG & Embeddings**: FAISS, Sentence Transformers (`all-MiniLM-L6-v2`), Google GenAI (`gemini-2.5-flash-lite`)
- **Security & Auth**: Python-JOSE, Passlib (Argon2 / Bcrypt), PyJWT
- **Email Service**: Python `smtplib` / `email.mime`

### Frontend
- **Framework**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- **Styling**: Tailwind CSS & Glassmorphism Design System
- **Visualizations**: D3-Geo, TopoJSON Client, Lucide React Icons
- **Document Generation**: `jsPDF`
- **HTTP Client**: Axios with centralized JWT Bearer interceptors

---

## 📁 Repository Structure

```text
UC09-MEMBER-RISK/
├── backend/
│   ├── app/
│   │   ├── api/                     # FastAPI route controllers
│   │   │   ├── auth.py              # Login, registration, /me, user management
│   │   │   ├── member.py            # Member query and details endpoints
│   │   │   ├── prediction.py        # CSV batch scoring & SHAP TreeExplainer
│   │   │   └── recommendation.py    # RAG intervention endpoints
│   │   ├── database/
│   │   │   ├── connection.py        # SQLAlchemy engine & session maker
│   │   │   └── models.py            # PostgreSQL database models
│   │   ├── services/
│   │   │   ├── email/               # Internal SMTP notification service
│   │   │   │   ├── config.py        # Environment settings (SMTP_HOST, etc.)
│   │   │   │   └── service.py       # Email formatting & delivery logic
│   │   │   ├── intervention_service.py # Core RAG orchestration & caching
│   │   │   ├── rag_service.py       # FAISS search + Gemini integration
│   │   │   └── shap_service.py      # SHAP explanation calculations
│   │   └── main.py                  # Application entry point & CORS configuration
│   ├── ml_models/                   # Trained ensemble models & preprocessors
│   ├── tests/                       # Role verification & RBAC integration tests
│   └── requirements.txt             # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/              # Reusable UI (RagRecommendationPanel, Badges, Modals)
│   │   │   ├── dashboard/           # USCountyRiskMap, RiskCategoryBarChart
│   │   │   └── layout/              # Sidebar, Header, ProtectedRoute
│   │   ├── pages/                   # Dashboard, Members, MemberDetails, Interventions, Upload, Login
│   │   ├── services/
│   │   │   └── api.ts               # Axios API service & type mappings
│   │   ├── types/                   # TypeScript domain models & interfaces
│   │   └── utils/
│   │       └── generateInterventionPdf.ts # Natural-language PDF report engine
│   ├── package.json                 # Frontend dependencies & build scripts
│   └── vite.config.ts               # Vite bundler configuration
├── rag/
│   ├── chunking/                    # Document chunking algorithms
│   ├── documents/                   # Medical guideline source PDFs & text
│   ├── embeddings/                  # Vector embeddings generator
│   └── vectorstore/                 # Serialized FAISS indices
└── README.md                        # Root project documentation
```

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** & `npm`
- **PostgreSQL 14+**

---

### 2. Backend Setup

1. **Navigate to the backend directory and create a virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Linux/macOS:
   source venv/bin/activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   pip install google-genai
   ```

3. **Configure Environment Variables (`backend/.env`)**:
   Create a `.env` file inside the `backend/` directory:
   ```env
   # PostgreSQL Connection
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/sdoh_db

   # JWT Security
   SECRET_KEY=your_super_secret_jwt_key_here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=480

   # Google Gemini API (for RAG Recommendations)
   GEMINI_API_KEY=your_gemini_api_key_here

   # SMTP Notification Settings
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=your_app_specific_password
   PAYER_VIEWER_EMAIL=payer_notifications@example.com
   SMTP_FROM_EMAIL=noreply@careriskpulse.org
   SMTP_FROM_NAME=CareRiskPulse Clinical Alerts
   EMAIL_USE_TLS=True
   EMAIL_DEBUG_MODE=False
   ```

4. **Initialize Database Tables**:
   Ensure PostgreSQL is running and the database exists:
   ```bash
   python -c "from app.database.connection import engine; from app.database.models import Base; Base.metadata.create_all(bind=engine)"
   ```

5. **Start the FastAPI Backend Server**:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   Backend will be accessible at: `http://127.0.0.1:8000` (API Docs: `http://127.0.0.1:8000/docs`).

---

### 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables (`frontend/.env`)**:
   ```env
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```

4. **Start the Frontend Development Server**:
   ```bash
   npm run dev
   ```
   Frontend will be accessible at: `http://localhost:5173`.

---

## 🧪 Verification & Test Suites

The project includes automated integration and role-verification scripts located in `backend/tests/`:

### 1. Full Role Lifecycle & Dynamic Reassignment Test
Verifies token issuance, role transitions, permission downgrades, and admin privileges:
```bash
python backend/tests/verify_role_refresh_lifecycle.py
```

### 2. Comprehensive RBAC Matrix Test
Executes test assertions against all 4 roles across authentication, members, prediction, and admin endpoints:
```bash
python backend/tests/test_rbac_matrix.py
```

### 3. Frontend Build & Typecheck
```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 📡 API Reference Overview

### 🔐 Authentication (`/auth`)
- `POST /auth/register` &mdash; Register new user (defaults to `payer_viewer`).
- `POST /auth/login` &mdash; Authenticate user and receive fresh JWT Bearer token.
- `GET /auth/me` &mdash; Authoritative profile & current database role check.
- `GET /auth/users` &mdash; *[Admin Only]* List all registered users.
- `PATCH /auth/users/{user_id}/role` &mdash; *[Admin Only]* Update user role.

### 👤 Member Registry (`/members`)
- `GET /members/` &mdash; Paginated member registry with sorting and search filters.
- `GET /members/{member_id}` &mdash; Complete member demographics, diagnoses, and SDOH values.
- `GET /members/metrics/summary` &mdash; High-level population risk KPIs and tier counts.

### 📈 Risk Prediction & SHAP (`/predict`)
- `POST /predict/` &mdash; *[Clinical/Care/Admin]* Ingest batch CSV dataset, execute ML ensemble scoring, and compute SHAP explanations.

### 💡 RAG Recommendations (`/recommendations`)
- `GET /recommendations/{member_id}` &mdash; Formulate or retrieve evidence-grounded care recommendations via FAISS + Gemini and trigger automated SMTP email notification.

---

## 📄 License & Compliance Notice

This platform processes synthetic and de-identified healthcare data for Clinical Decision Support (CDS) demonstration purposes. It conforms to HIPAA security standards regarding role separation, access controls, password hashing, and encrypted token transport.
