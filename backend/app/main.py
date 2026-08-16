from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.services.email import email_router

app = FastAPI(
    title="Member Risk Analytics Backend",
    description="UC09 Social Determinants of Health (SDOH) Clinical Decision Support System Backend",
    version="1.0.0"
)

# Set up CORS middleware to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For prototype purposes; configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the email service endpoints
app.include_router(email_router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "UC09 Member Risk Analytics API",
        "endpoints": {
            "root": "/",
            "email_service": "/api/email"
        }
    }
