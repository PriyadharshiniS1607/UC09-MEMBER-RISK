from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.intervention import router as intervention_router
from app.api.auth import router as auth_router
from app.api.member import router as member_router
from app.api.prediction import router as prediction_router
from app.api.recommendation import router as recommendation_router


app = FastAPI(
    title="Member Risk Analytics Backend",
    description=(
        "UC09 Social Determinants of Health "
        "(SDOH) Clinical Decision Support System Backend"
    ),
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# API ROUTERS
# ============================================================

# Member APIs
app.include_router(member_router)

# Prediction APIs
app.include_router(prediction_router)

# Authentication APIs
app.include_router(auth_router)

# Recommendation APIs
app.include_router(recommendation_router)

# Intervention APIs
# This router handles the recommendation/intervention workflow.
# The email is sent internally after a new intervention is committed.
app.include_router(intervention_router)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "UC09 Member Risk Analytics API",
        "endpoints": {
            "root": "/",
            "auth_login": "/auth/login",
            "auth_register": "/auth/register",
            "auth_me": "/auth/me",
        },
    }