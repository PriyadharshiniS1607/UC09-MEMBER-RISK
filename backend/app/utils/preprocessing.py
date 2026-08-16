from pathlib import Path
import pickle
import pandas as pd


# ============================================================
# 1. LOAD TRAINING FEATURE NAMES
# ============================================================

# Project structure:
#
# backend/
# ├── app/
# │   └── utils/
# │       └── preprocessing.py
# └── ml_models/
#     └── feature_names.pkl


BASE_DIR = Path(__file__).resolve().parents[2]

FEATURE_NAMES_PATH = (
    BASE_DIR / "ml_models" / "feature_names.pkl"
)


if not FEATURE_NAMES_PATH.exists():
    raise FileNotFoundError(
        f"feature_names.pkl not found at: {FEATURE_NAMES_PATH}"
    )


with open(FEATURE_NAMES_PATH, "rb") as f:
    FEATURE_NAMES = pickle.load(f)


FEATURE_NAMES = list(FEATURE_NAMES)


# ============================================================
# 2. DEFINE THE 54 BASE FEATURES
# ============================================================

BASE_FEATURES = [

    # --------------------------------------------------------
    # Demographic — 2
    # --------------------------------------------------------
    "age",
    "gender",

    # --------------------------------------------------------
    # Clinical — 7
    # --------------------------------------------------------
    "diabetes",
    "hypertension",
    "heart_disease",
    "copd",
    "obesity",
    "cancer",
    "chronic_condition_count",

    # --------------------------------------------------------
    # Healthcare Utilization / Care Gap — 5
    # --------------------------------------------------------
    "total_encounters",
    "ed_visits",
    "hospitalizations",
    "medication_count",
    "preventive_care_gap",

    # --------------------------------------------------------
    # SVI — 17
    # --------------------------------------------------------
    "EP_POV150",
    "EP_UNEMP",
    "EP_HBURD",
    "EP_NOHSDP",
    "EP_UNINSUR",
    "EP_AGE65",
    "EP_AGE17",
    "EP_DISABL",
    "EP_SNGPNT",
    "EP_LIMENG",
    "EP_MINRTY",
    "EP_MUNIT",
    "EP_MOBILE",
    "EP_CROWD",
    "EP_NOVEH",
    "EP_GROUPQ",
    "RPL_THEMES",

    # --------------------------------------------------------
    # CDC PLACES — 18
    # --------------------------------------------------------
    "DIABETES_AdjPrev",
    "OBESITY_AdjPrev",
    "CSMOKING_AdjPrev",
    "LPA_AdjPrev",
    "BPHIGH_AdjPrev",
    "HIGHCHOL_AdjPrev",
    "CHD_AdjPrev",
    "STROKE_AdjPrev",
    "COPD_AdjPrev",
    "CASTHMA_AdjPrev",
    "CANCER_AdjPrev",
    "DEPRESSION_AdjPrev",
    "MHLTH_AdjPrev",
    "PHLTH_AdjPrev",
    "GHLTH_AdjPrev",
    "ARTHRITIS_AdjPrev",
    "DISABILITY_AdjPrev",
    "INDEPLIVE_AdjPrev",

    # --------------------------------------------------------
    # USDA Food Access — 5
    # --------------------------------------------------------
    "children_low_access_pct",
    "no_vehicle_low_access_pct",
    "low_income_low_access_pct",
    "low_food_access_pct",
    "seniors_low_access_pct"
]


# ============================================================
# 3. PLACES FEATURES
# ============================================================

PLACES_FEATURES = [

    "DIABETES_AdjPrev",
    "OBESITY_AdjPrev",
    "CSMOKING_AdjPrev",
    "LPA_AdjPrev",
    "BPHIGH_AdjPrev",
    "HIGHCHOL_AdjPrev",
    "CHD_AdjPrev",
    "STROKE_AdjPrev",
    "COPD_AdjPrev",
    "CASTHMA_AdjPrev",
    "CANCER_AdjPrev",
    "DEPRESSION_AdjPrev",
    "MHLTH_AdjPrev",
    "PHLTH_AdjPrev",
    "GHLTH_AdjPrev",
    "ARTHRITIS_AdjPrev",
    "DISABILITY_AdjPrev",
    "INDEPLIVE_AdjPrev"
]


# ============================================================
# 4. VALIDATE FEATURE CONFIGURATION
# ============================================================

if len(BASE_FEATURES) != 54:
    raise ValueError(
        f"Expected 54 base features, "
        f"but found {len(BASE_FEATURES)}."
    )


# ============================================================
# 5. PREPROCESSING FUNCTION
# ============================================================

def preprocess_input(df: pd.DataFrame):
    """
    Preprocess raw uploaded CSV data for the
    already-trained UC09 stacking model.

    Returns
    -------
    X_model : pandas.DataFrame
        Final model-ready feature matrix.

    processed_df : pandas.DataFrame
        Cleaned and processed DataFrame.
    """

    # --------------------------------------------------------
    # Validate input
    # --------------------------------------------------------

    if not isinstance(df, pd.DataFrame):
        raise TypeError(
            "Input must be a pandas DataFrame."
        )

    if df.empty:
        raise ValueError(
            "Input DataFrame is empty."
        )

    df = df.copy()


    # ========================================================
    # 6. CLEAN COLUMN NAMES
    # ========================================================

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
    )


    # ========================================================
    # 7. CHECK REQUIRED FEATURES
    # ========================================================

    missing_features = [
        feature
        for feature in BASE_FEATURES
        if feature not in df.columns
        and feature != "gender"
    ]

    if missing_features:
        raise ValueError(
            "The uploaded CSV is missing required features: "
            + ", ".join(missing_features)
        )


    # ========================================================
    # 8. CLEAN CountyFIPS
    # ========================================================

    if "CountyFIPS" in df.columns:

        df["CountyFIPS"] = (
            df["CountyFIPS"]
            .astype(str)
            .str.replace(".0", "", regex=False)
            .str.strip()
            .str.zfill(5)
        )


    # ========================================================
    # 9. CLEAN StateFIPS
    # ========================================================

    if "StateFIPS" in df.columns:

        df["StateFIPS"] = (
            df["StateFIPS"]
            .astype(str)
            .str.replace(".0", "", regex=False)
            .str.strip()
            .str.zfill(2)
        )


    # ========================================================
    # 10. NUMERIC FEATURES
    # ========================================================

    numeric_features = [
        feature
        for feature in BASE_FEATURES
        if feature != "gender"
    ]


    # ========================================================
    # 11. CONVERT NUMERIC COLUMNS
    # ========================================================

    for column in numeric_features:

        if column in df.columns:

            df[column] = pd.to_numeric(
                df[column],
                errors="coerce"
            )


    # ========================================================
    # 12. PLACES STATE-MEDIAN IMPUTATION
    # ========================================================

    # First:
    #     Missing PLACES value
    #             ↓
    #     State-level median
    #
    # If still missing:
    #     Overall median

    if "StateFIPS" in df.columns:

        for column in PLACES_FEATURES:

            if column not in df.columns:
                continue

            state_median = (
                df.groupby("StateFIPS")[column]
                .transform("median")
            )

            df[column] = df[column].fillna(
                state_median
            )

            overall_median = df[column].median()

            if pd.notna(overall_median):

                df[column] = df[column].fillna(
                    overall_median
                )

    else:

        # If StateFIPS is unavailable,
        # use overall median.

        for column in PLACES_FEATURES:

            if column not in df.columns:
                continue

            overall_median = df[column].median()

            if pd.notna(overall_median):

                df[column] = df[column].fillna(
                    overall_median
                )


    # ========================================================
    # 13. OTHER NUMERIC FEATURE IMPUTATION
    # ========================================================

    for column in numeric_features:

        if column not in df.columns:
            continue

        # PLACES was already handled above.
        if column in PLACES_FEATURES:
            continue

        median_value = df[column].median()

        if pd.notna(median_value):

            df[column] = df[column].fillna(
                median_value
            )


    # ========================================================
    # 14. GENDER ONE-HOT ENCODING
    # ========================================================

    if "gender" in df.columns:

        df["gender"] = (
            df["gender"]
            .astype(str)
            .str.strip()
        )

        # SAME METHOD USED DURING MODEL TRAINING
        df = pd.get_dummies(
            df,
            columns=["gender"],
            drop_first=True,
            dtype=int
        )


    # ========================================================
    # 15. ALIGN WITH FEATURE_NAMES.PKL
    # ========================================================

    # If a feature expected by the trained model
    # does not exist in a new uploaded CSV,
    # create it with zero.

    for feature in FEATURE_NAMES:

        if feature not in df.columns:

            df[feature] = 0


    # ========================================================
    # 16. SELECT FEATURES IN TRAINING ORDER
    # ========================================================

    X_model = df[FEATURE_NAMES].copy()


    # ========================================================
    # 17. ENSURE NUMERIC MODEL INPUT
    # ========================================================

    X_model = X_model.apply(
        pd.to_numeric,
        errors="coerce"
    )


    # ========================================================
    # 18. FINAL MISSING VALUE CHECK
    # ========================================================

    # IMPORTANT:
    # We do NOT use fillna(0) here.
    #
    # If missing values remain, something went wrong
    # during preprocessing.

    if X_model.isna().any().any():

        missing_columns = (
            X_model.columns[
                X_model.isna().any()
            ]
            .tolist()
        )

        raise ValueError(
            "Missing values remain after preprocessing "
            f"in columns: {missing_columns}"
        )


    # ========================================================
    # 19. FINAL FEATURE ORDER CHECK
    # ========================================================

    if list(X_model.columns) != FEATURE_NAMES:

        raise ValueError(
            "Final feature order does not match "
            "feature_names.pkl."
        )


    # ========================================================
    # 20. RETURN
    # ========================================================

    return X_model, df

