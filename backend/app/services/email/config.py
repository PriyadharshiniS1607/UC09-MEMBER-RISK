import os
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from dotenv import load_dotenv

# Load env variables from .env file if it exists
load_dotenv()

class EmailConfig(BaseModel):
    # SMTP configuration
    smtp_server: str = Field(default_factory=lambda: os.getenv("SMTP_SERVER", "localhost"))
    smtp_port: int = Field(default_factory=lambda: int(os.getenv("SMTP_PORT", "587")))
    smtp_username: Optional[str] = Field(default_factory=lambda: os.getenv("SMTP_USERNAME"))
    smtp_password: Optional[str] = Field(default_factory=lambda: os.getenv("SMTP_PASSWORD"))
    
    # Sender configuration
    from_email: str = Field(default_factory=lambda: os.getenv("SMTP_FROM_EMAIL", "noreply@healthfirst.org"))
    from_name: str = Field(default_factory=lambda: os.getenv("SMTP_FROM_NAME", "Clinical Alerts"))
    
    # Security options
    use_tls: bool = Field(default_factory=lambda: os.getenv("EMAIL_USE_TLS", "True").lower() == "true")
    use_ssl: bool = Field(default_factory=lambda: os.getenv("EMAIL_USE_SSL", "False").lower() == "true")
    
    # Debug / Mock options
    # In debug/mock mode, we log and save emails as files instead of sending them via SMTP.
    debug_mode: bool = Field(default_factory=lambda: os.getenv("EMAIL_DEBUG_MODE", "True").lower() == "true")
    
    # Isolated location for storing mock sent emails
    sent_emails_dir: str = Field(
        default_factory=lambda: os.getenv(
            "EMAIL_SENT_LOGS_DIR", 
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "data", "sent_emails")
        )
    )

# Instantiate a global settings object
settings = EmailConfig()
