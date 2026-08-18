from io import BytesIO

import pandas as pd
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import (
    Member,
    RiskPrediction,
    ShapExplanation,
)
from app.security.permissions import require_prediction_access
from app.services.risk_service import get_risk_predictions
from app.services.shap_service import get_shap_explanation


router = APIRouter(
    prefix="/predict",
    tags=["Prediction"],
)


# ============================================================
# SECURITY LIMITS
# ============================================================

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
MAX_ROWS = 50_000

MODEL_VERSION = "UC09_3Model_Stacking_Ensemble"


# ============================================================
# MEMBER COLUMN MAPPING
#
# CSV column name -> Member model column name
# ============================================================

MEMBER_COLUMN_MAPPING = {
    "member_id": "member_id",

    "age": "age",
    "gender": "gender",

    "StateFIPS": "state_fips",
    "CountyFIPS": "county_fips",

    "diabetes": "diabetes",
    "hypertension": "hypertension",
    "heart_disease": "heart_disease",
    "copd": "copd",
    "obesity": "obesity",
    "cancer": "cancer",
    "chronic_condition_count": "chronic_condition_count",

    "total_encounters": "total_encounters",
    "ed_visits": "ed_visits",
    "hospitalizations": "hospitalizations",
    "medication_count": "medication_count",
    "preventive_care_gap": "preventive_care_gap",

    "EP_POV150": "ep_pov150",
    "EP_UNEMP": "ep_unemp",
    "EP_HBURD": "ep_hburd",
    "EP_NOHSDP": "ep_nohsdp",
    "EP_UNINSUR": "ep_uninsur",
    "EP_AGE65": "ep_age65",
    "EP_AGE17": "ep_age17",
    "EP_DISABL": "ep_disabl",
    "EP_SNGPNT": "ep_sngpnt",
    "EP_LIMENG": "ep_limeng",
    "EP_MINRTY": "ep_minrty",
    "EP_MUNIT": "ep_munit",
    "EP_MOBILE": "ep_mobile",
    "EP_CROWD": "ep_crowd",
    "EP_NOVEH": "ep_noveh",
    "EP_GROUPQ": "ep_groupq",
    "RPL_THEMES": "rpl_themes",

    "DIABETES_AdjPrev": "diabetes_adjprev",
    "OBESITY_AdjPrev": "obesity_adjprev",
    "CSMOKING_AdjPrev": "csmoking_adjprev",
    "LPA_AdjPrev": "lpa_adjprev",
    "BPHIGH_AdjPrev": "bphigh_adjprev",
    "HIGHCHOL_AdjPrev": "highchol_adjprev",
    "CHD_AdjPrev": "chd_adjprev",
    "STROKE_AdjPrev": "stroke_adjprev",
    "COPD_AdjPrev": "copd_adjprev",
    "CASTHMA_AdjPrev": "casthma_adjprev",
    "CANCER_AdjPrev": "cancer_adjprev",
    "DEPRESSION_AdjPrev": "depression_adjprev",
    "MHLTH_AdjPrev": "mhlth_adjprev",
    "PHLTH_AdjPrev": "phlth_adjprev",
    "GHLTH_AdjPrev": "ghlth_adjprev",
    "ARTHRITIS_AdjPrev": "arthritis_adjprev",
    "DISABILITY_AdjPrev": "disability_adjprev",
    "INDEPLIVE_AdjPrev": "indeplive_adjprev",

    "children_low_access_pct": "children_low_access_pct",
    "no_vehicle_low_access_pct": "no_vehicle_low_access_pct",
    "low_income_low_access_pct": "low_income_low_access_pct",
    "low_food_access_pct": "low_food_access_pct",
    "seniors_low_access_pct": "seniors_low_access_pct",
}


# ============================================================
# HELPERS
# ============================================================

def clean_value(value):
    """
    Convert pandas values into SQLAlchemy-safe Python values.
    """

    if pd.isna(value):
        return None

    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass

    return value


def build_member_data(row):
    """
    Convert one CSV row into a dictionary compatible
    with the Member SQLAlchemy model.

    The original CSV column names are preserved for the
    ML pipeline. This function only prepares data for
    database storage.
    """

    member_data = {}

    for csv_column, model_column in MEMBER_COLUMN_MAPPING.items():

        if csv_column not in row.index:
            continue

        value = clean_value(row[csv_column])

        # ----------------------------------------------------
        # String fields
        # ----------------------------------------------------

        if model_column in {
            "member_id",
            "gender",
            "state_fips",
            "county_fips",
        }:

            if value is not None:
                value = str(value).strip()

                # Preserve FIPS formatting
                if model_column == "state_fips":
                    value = (
                        value
                        .replace(".0", "")
                        .zfill(2)
                    )

                elif model_column == "county_fips":
                    value = (
                        value
                        .replace(".0", "")
                        .zfill(5)
                    )

        # ----------------------------------------------------
        # Numeric fields
        # ----------------------------------------------------

        else:

            if value is not None:

                try:
                    value = float(value)

                except (TypeError, ValueError):
                    value = None

        member_data[model_column] = value

    return member_data


def upsert_member(
    db: Session,
    row,
):
    """
    Create a new member or update an existing member.

    member_id is the business identifier from the CSV.
    """

    member_data = build_member_data(row)

    member_id = member_data.get("member_id")

    if not member_id:
        raise ValueError(
            "Each CSV row must contain a valid member_id."
        )

    member = (
        db.query(Member)
        .filter(
            Member.member_id == member_id
        )
        .first()
    )

    if member is None:

        member = Member(
            **member_data
        )

        db.add(member)
        db.flush()

    else:

        for field, value in member_data.items():

            if field == "member_id":
                continue

            setattr(
                member,
                field,
                value,
            )

        db.flush()

    return member


# ============================================================
# PREDICTION API
# ============================================================

@router.post("/")
async def predict(
    file: UploadFile = File(...),
    current_user=Depends(
        require_prediction_access()
    ),
    db: Session = Depends(get_db),
):
    """
    Run the complete UC09 prediction pipeline.

    Pipeline:

        CSV
          ↓
        CSV validation
          ↓
        preprocessing
          ↓
        ML stacking ensemble
          ↓
        members
          ↓
        risk_predictions
          ↓
        SHAP explanation
          ↓
        shap_explanations

    Prediction access:

        payer_admin
        clinical_analyst
        care_manager

    payer_viewer is denied.
    """

    # ========================================================
    # 1. VALIDATE FILE NAME
    # ========================================================

    if not file.filename:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File name is required",
        )

    if not file.filename.lower().endswith(
        ".csv"
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed",
        )


    # ========================================================
    # 2. READ UPLOADED FILE
    # ========================================================

    contents = await file.read()


    # ========================================================
    # 3. VALIDATE FILE SIZE
    # ========================================================

    if len(contents) > MAX_FILE_SIZE:

        raise HTTPException(
            status_code=(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            ),
            detail=(
                "File size exceeds the "
                "15 MB limit"
            ),
        )

    if len(contents) == 0:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )


    # ========================================================
    # 4. PARSE CSV
    # ========================================================

    try:

        df = pd.read_csv(
            BytesIO(contents)
        )

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid CSV file: {str(exc)}",
        )


    # ========================================================
    # 5. VALIDATE CSV
    # ========================================================

    if df.empty:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV contains no data rows",
        )

    if len(df) > MAX_ROWS:

        raise HTTPException(
            status_code=(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            ),
            detail=(
                f"CSV cannot contain more than "
                f"{MAX_ROWS} rows"
            ),
        )


    # ========================================================
    # 6. CLEAN COLUMN NAMES
    #
    # This does NOT rename the columns.
    #
    # preprocessing.py expects the original training
    # feature names such as:
    #
    # EP_POV150
    # DIABETES_AdjPrev
    # StateFIPS
    # CountyFIPS
    #
    # So we only strip whitespace.
    # ========================================================

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
    )


    # ========================================================
    # 7. MEMBER ID VALIDATION
    # ========================================================

    if "member_id" not in df.columns:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "CSV must contain a "
                "'member_id' column"
            ),
        )

    if (
        df["member_id"]
        .isna()
        .any()
    ):

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "CSV contains rows with "
                "missing member_id"
            ),
        )

    # Detect duplicate member IDs in the same upload
    duplicated_ids = (
        df["member_id"]
        .astype(str)
        .duplicated()
    )

    if duplicated_ids.any():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "CSV contains duplicate "
                "member_id values"
            ),
        )


    # ========================================================
    # 8. RUN ML PREDICTION
    #
    # risk_service calls preprocessing.py internally.
    #
    # IMPORTANT:
    # We pass the ORIGINAL df so the trained feature
    # names remain intact.
    # ========================================================

    try:

        results = get_risk_predictions(
            df
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception as exc:

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                f"Prediction failed: {str(exc)}"
            ),
        )


    # ========================================================
    # 9. VALIDATE RESULT COUNT
    # ========================================================

    if len(results) != len(df):

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Prediction result count does "
                "not match CSV row count"
            ),
        )


    # ========================================================
    # 10. DATABASE TRANSACTION
    #
    # Everything below is stored together.
    #
    # If an error occurs:
    #
    #     members
    #     risk_predictions
    #     shap_explanations
    #
    # are rolled back.
    # ========================================================

    saved_predictions = []

    try:

        for index, row in df.iterrows():

            # ------------------------------------------------
            # Get prediction result for this CSV row
            # ------------------------------------------------

            prediction_result = results[index]

            member_id = str(
                row["member_id"]
            ).strip()


            # ------------------------------------------------
            # Save / update MEMBER
            # ------------------------------------------------

            member = upsert_member(
                db=db,
                row=row,
            )


            # ------------------------------------------------
            # Risk score
            # ------------------------------------------------

            risk_score = float(
                prediction_result[
                    "combined_risk_score"
                ]
            )


            # ------------------------------------------------
            # Risk category
            # ------------------------------------------------

            risk_category = (
                prediction_result.get(
                    "risk_level"
                )
            )

            if not risk_category:

                raise ValueError(
                    "Prediction result is missing "
                    "risk_level"
                )


            # ------------------------------------------------
            # Save RISK PREDICTION
            # ------------------------------------------------

            risk_prediction = RiskPrediction(
                member_id=member.id,

                risk_score=risk_score,

                risk_category=risk_category,

                model_version=MODEL_VERSION,

                created_by=current_user.id,
            )

            db.add(
                risk_prediction
            )

            db.flush()


            # ------------------------------------------------
            # Generate SHAP explanation
            #
            # SHAP uses the ORIGINAL CSV row.
            #
            # shap_service.py calls preprocessing.py
            # itself, ensuring the exact 54 model features
            # and feature order are used.
            # ------------------------------------------------

            shap_result = get_shap_explanation(
                row,
                top_n=10,
            )


            # ------------------------------------------------
            # Validate SHAP result
            # ------------------------------------------------

            if not isinstance(
                shap_result,
                dict
            ):

                raise ValueError(
                    "Invalid SHAP explanation result"
                )

            risk_drivers = (
                shap_result.get(
                    "risk_drivers",
                    []
                )
            )


            # ------------------------------------------------
            # Save SHAP EXPLANATION
            # ------------------------------------------------

            shap_explanation = ShapExplanation(
                member_id=member.id,

                prediction_id=(
                    risk_prediction.id
                ),

                top_risk_drivers=risk_drivers,
            )

            db.add(
                shap_explanation
            )

            db.flush()


            # ------------------------------------------------
            # Build API response
            # ------------------------------------------------

            saved_predictions.append(
                {
                    "prediction_id": (
                        risk_prediction.id
                    ),

                    "member_id": member_id,

                    "risk_score": risk_score,

                    "risk_category": (
                        risk_category
                    ),

                    "shap_explanation_id": (
                        shap_explanation.id
                    ),

                    "top_risk_drivers": (
                        risk_drivers
                    ),
                }
            )


        # ====================================================
        # COMMIT ALL DATABASE CHANGES
        # ====================================================

        db.commit()


    except ValueError as exc:

        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


    except Exception as exc:

        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Failed to save prediction "
                f"results: {str(exc)}"
            ),
        )


    # ========================================================
    # 11. FINAL RESPONSE
    # ========================================================

    return {
        "message": (
            "Prediction, member, and SHAP "
            "processing completed successfully"
        ),

        "requested_by": {
            "id": current_user.id,
            "username": current_user.username,
            "role": current_user.role,
        },

        "total_members": len(
            saved_predictions
        ),

        "predictions": saved_predictions,
    }

