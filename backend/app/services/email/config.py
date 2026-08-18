import os
from typing import Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()


class EmailConfig(BaseModel):
    # SMTP configuration - reads from .env
    smtp_host: str = Field(
        default_factory=lambda: os.getenv(
            "SMTP_HOST", 
            os.getenv("SMTP_SERVER", "smtp.gmail.com")
        )
    )
    smtp_port: int = Field(
        default_factory=lambda: int(os.getenv("SMTP_PORT", "587"))
    )
    smtp_username: Optional[str] = Field(
        default_factory=lambda: os.getenv("SMTP_USERNAME")
    )
    smtp_password: Optional[str] = Field(
        default_factory=lambda: os.getenv("SMTP_PASSWORD")
    )
    
    # Recipient configuration
    payer_viewer_email: str = Field(
        default_factory=lambda: os.getenv(
            "PAYER_VIEWER_EMAIL", 
            os.getenv("SMTP_TO_EMAIL", "payerviewer1@example.com")
        )
    )
    
    # Sender configuration
    from_email: str = Field(
        default_factory=lambda: os.getenv(
            "SMTP_FROM_EMAIL", 
            os.getenv("SMTP_USERNAME", "noreply@careriskpulse.org")
        )
    )
    from_name: str = Field(
        default_factory=lambda: os.getenv(
            "SMTP_FROM_NAME", 
            "CareRiskPulse Clinical Alerts"
        )
    )
    
    # Security options
    use_tls: bool = Field(
        default_factory=lambda: os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
    )
    use_ssl: bool = Field(
        default_factory=lambda: os.getenv("EMAIL_USE_SSL", "False").lower() == "true"
    )
    
    # Debug / Mock options
    # If no SMTP credentials are configured or EMAIL_DEBUG_MODE is enabled, save to disk
    debug_mode: bool = Field(
        default_factory=lambda: os.getenv("EMAIL_DEBUG_MODE", "False").lower() == "true"
    )
    
    # Directory for storing mock/debug sent emails
    sent_emails_dir: str = Field(
        default_factory=lambda: os.getenv(
            "EMAIL_SENT_LOGS_DIR", 
            os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 
                "data", 
                "sent_emails"
            )
        )
    )


# Instantiate a global settings object
settings = EmailConfig()
