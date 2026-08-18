from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Member APIs
app.include_router(member_router)
# Prediction APIs
app.include_router(prediction_router)
# Authentication APIs
app.include_router(auth_router)
# Recommendation APIs
app.include_router(recommendation_router)


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
            "recommendations": "/recommendations/{member_id}",
        },
    }