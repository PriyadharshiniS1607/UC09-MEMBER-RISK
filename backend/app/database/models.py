
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.connection import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="payer_viewer",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


# ============================================================
# MEMBER
#
# Stores the actual member information received from the CSV.
# ============================================================

class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    member_id: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    # --------------------------------------------------------
    # Demographic
    # --------------------------------------------------------

    age: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    gender: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    # --------------------------------------------------------
    # Geographic identifiers
    # --------------------------------------------------------

    state_fips: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
    )

    county_fips: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
    )

    # --------------------------------------------------------
    # Clinical
    # --------------------------------------------------------

    diabetes: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    hypertension: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    heart_disease: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    copd: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    obesity: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    cancer: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    chronic_condition_count: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # --------------------------------------------------------
    # Healthcare utilization / care gap
    # --------------------------------------------------------

    total_encounters: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ed_visits: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    hospitalizations: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    medication_count: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    preventive_care_gap: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # --------------------------------------------------------
    # SVI
    # --------------------------------------------------------

    ep_pov150: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_unemp: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_hburd: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_nohsdp: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_uninsur: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_age65: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_age17: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_disabl: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_sngpnt: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_limeng: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_minrty: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_munit: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_mobile: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_crowd: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_noveh: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ep_groupq: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    rpl_themes: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # --------------------------------------------------------
    # CDC PLACES
    # --------------------------------------------------------

    diabetes_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    obesity_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    csmoking_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    lpa_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    bphigh_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    highchol_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    chd_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    stroke_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    copd_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    casthma_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    cancer_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    depression_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    mhlth_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    phlth_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    ghlth_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    arthritis_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    disability_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    indeplive_adjprev: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # --------------------------------------------------------
    # USDA Food Access
    # --------------------------------------------------------

    children_low_access_pct: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    no_vehicle_low_access_pct: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    low_income_low_access_pct: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    low_food_access_pct: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    seniors_low_access_pct: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    # --------------------------------------------------------
    # Timestamps
    # --------------------------------------------------------

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # --------------------------------------------------------
    # Relationships
    # --------------------------------------------------------

    risk_predictions = relationship(
        "RiskPrediction",
        back_populates="member",
        cascade="all, delete-orphan",
    )

    shap_explanations = relationship(
        "ShapExplanation",
        back_populates="member",
        cascade="all, delete-orphan",
    )

    interventions = relationship(
        "Intervention",
        back_populates="member",
        cascade="all, delete-orphan",
    )

    email_notifications = relationship(
        "EmailNotification",
        back_populates="member",
        cascade="all, delete-orphan",
    )


# ============================================================
# RISK PREDICTION
#
# Stores ML prediction results.
# ============================================================

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id"),
        nullable=False,
        index=True,
    )

    risk_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    risk_category: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    model_version: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    member = relationship(
        "Member",
        back_populates="risk_predictions",
    )


# ============================================================
# SHAP EXPLANATIONS
#
# Stores top SHAP risk drivers for a prediction.
# ============================================================

class ShapExplanation(Base):
    __tablename__ = "shap_explanations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id"),
        nullable=False,
        index=True,
    )

    prediction_id: Mapped[int] = mapped_column(
        ForeignKey("risk_predictions.id"),
        nullable=False,
        index=True,
    )

    top_risk_drivers: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    member = relationship(
        "Member",
        back_populates="shap_explanations",
    )

    prediction = relationship(
        "RiskPrediction",
    )


# ============================================================
# INTERVENTIONS
#
# Stores recommendations generated by the RAG layer.
# ============================================================

class Intervention(Base):
    __tablename__ = "interventions"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    member_id: Mapped[int] = mapped_column(
        ForeignKey("members.id"),
        nullable=False,
        index=True,
    )

    prediction_id: Mapped[int | None] = mapped_column(
        ForeignKey("risk_predictions.id"),
        nullable=True,
        index=True,
    )

    intervention_priority: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    recommendations: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    source: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="RAG",
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
    )

    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    member = relationship(
        "Member",
        back_populates="interventions",
    )

    prediction = relationship(
        "RiskPrediction",
    )


# ============================================================
# EMAIL NOTIFICATIONS
#
# Stores email notification history.
# ============================================================

class EmailNotification(Base):
    __tablename__ = "email_notifications"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    member_id: Mapped[int | None] = mapped_column(
        ForeignKey("members.id"),
        nullable=True,
        index=True,
    )

    recipient_email: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    subject: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    notification_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="PENDING",
    )

    error_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    member = relationship(
        "Member",
        back_populates="email_notifications",
    )
