import pandas as pd
import pickle

FEATURE_NAMES_PATH = "ml_models/feature_names.pkl"

with open(FEATURE_NAMES_PATH, "rb") as f:
    FEATURE_NAMES = pickle.load(f)

BASE_FEATURES = [
    "age", "gender",
    "diabetes", "hypertension", "heart_disease", "copd",
    "obesity", "cancer", "chronic_condition_count",
    "total_encounters", "ed_visits", "hospitalizations",
    "medication_count", "preventive_care_gap",
    "EP_POV150", "EP_UNEMP", "EP_HBURD", "EP_NOHSDP",
    "EP_UNINSUR", "EP_AGE65", "EP_AGE17", "EP_DISABL",
    "EP_SNGPNT", "EP_LIMENG", "EP_MINRTY", "EP_MUNIT",
    "EP_MOBILE", "EP_CROWD", "EP_NOVEH", "EP_GROUPQ",
    "RPL_THEMES",
    "DIABETES_AdjPrev", "OBESITY_AdjPrev", "CSMOKING_AdjPrev",
    "LPA_AdjPrev", "BPHIGH_AdjPrev", "HIGHCHOL_AdjPrev",
    "CHD_AdjPrev", "STROKE_AdjPrev", "COPD_AdjPrev",
    "CASTHMA_AdjPrev", "CANCER_AdjPrev", "DEPRESSION_AdjPrev",
    "MHLTH_AdjPrev", "PHLTH_AdjPrev", "GHLTH_AdjPrev",
    "ARTHRITIS_AdjPrev", "DISABILITY_AdjPrev", "INDEPLIVE_AdjPrev",
    "children_low_access_pct", "no_vehicle_low_access_pct",
    "low_income_low_access_pct", "low_food_access_pct",
    "seniors_low_access_pct"
]

PLACES_FEATURES = [
    "DIABETES_AdjPrev", "OBESITY_AdjPrev", "CSMOKING_AdjPrev",
    "LPA_AdjPrev", "BPHIGH_AdjPrev", "HIGHCHOL_AdjPrev",
    "CHD_AdjPrev", "STROKE_AdjPrev", "COPD_AdjPrev",
    "CASTHMA_AdjPrev", "CANCER_AdjPrev", "DEPRESSION_AdjPrev",
    "MHLTH_AdjPrev", "PHLTH_AdjPrev", "GHLTH_AdjPrev",
    "ARTHRITIS_AdjPrev", "DISABILITY_AdjPrev", "INDEPLIVE_AdjPrev"
]

def preprocess_input(df):
    df = df.copy()
    df.columns = df.columns.str.strip()

    if "CountyFIPS" in df.columns:
        df["CountyFIPS"] = (
            df["CountyFIPS"].astype(str)
            .str.replace(".0", "", regex=False)
            .str.strip().str.zfill(5)
        )

    numeric_features = [c for c in BASE_FEATURES if c != "gender"]

    for col in numeric_features:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "StateFIPS" in df.columns:
        df["StateFIPS"] = (
            df["StateFIPS"].astype(str)
            .str.replace(".0", "", regex=False)
            .str.strip().str.zfill(2)
        )

        for col in PLACES_FEATURES:
            if col in df.columns:
                state_median = df.groupby("StateFIPS")[col].transform("median")
                df[col] = df[col].fillna(state_median)
                df[col] = df[col].fillna(df[col].median())

    for col in numeric_features:
        if col in df.columns:
            df[col] = df[col].fillna(df[col].median())

    if "gender" in df.columns:
        df["gender"] = df["gender"].astype(str).str.strip()
        df = pd.get_dummies(
            df,
            columns=["gender"],
            drop_first=True,
            dtype=int
        )

    for feature in FEATURE_NAMES:
        if feature not in df.columns:
            df[feature] = 0

    X_model = df[FEATURE_NAMES].copy()
    X_model = X_model.apply(pd.to_numeric, errors="coerce")
    X_model = X_model.fillna(0)

    return X_model, df
