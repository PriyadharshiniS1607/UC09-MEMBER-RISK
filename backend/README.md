# UC09 Member Risk - Backend

Backend machine-learning services for the **UC09 Member Risk Prediction** system.

This module provides the complete ML inference pipeline for member-level risk prediction, risk classification, and SHAP-based risk explanation.

> **Note:** API endpoint integration is handled separately by the API team. This README covers the ML/backend services implemented in this module.

---

## 1. Backend Responsibilities

The backend ML module currently provides:

- Input preprocessing
- Missing-value handling
- Feature alignment and ordering
- Gender encoding
- Stacking ensemble prediction
- CatBoost prediction
- LightGBM prediction
- XGBoost prediction
- Ridge meta-model prediction
- Combined risk score generation
- Risk-level classification using `risk_thresholds.json`
- SHAP-based model explanation
- SHAP risk-driver identification
- Member-level prediction validation
- Colab vs backend prediction validation

---

## 2. Project Structure

```text
backend/
│
├── app/
│   ├── api/
│   │   └── ...
│   │
│   ├── services/
│   │   ├── prediction_service.py
│   │   ├── risk_service.py
│   │   └── shap_service.py
│   │
│   └── utils/
│       └── preprocessing.py
│
├── data/
│   └── UC09_FINAL_MEMBER_RISK_DATASET.csv
│
├── ml_models/
│   ├── UC09_3Model_Stacking_Ensemble.pkl
│   ├── feature_names.pkl
│   ├── shap_background.pkl
│   └── risk_thresholds.json
│
├── tests/
│   ├── test_prediction.py
│   ├── test_colab_prediction.py
│   ├── test_member_m06253.py
│   ├── debug_preprocessing.py
│   ├── debug_member_stacking.py
│   ├── inspect_loaded_package.py
│   ├── test_risk_service.py
│   ├── test_shap_background.py
│   └── test_shap_service.py
│
├── requirements.txt
└── README.md
```

---

## 3. Environment

The backend was developed and validated using the following stack:

- **Python:** `3.11`
- **XGBoost:** `3.2.0`
- **scikit-learn:** `1.6.1`
- **CatBoost:** `1.2.10`
- **LightGBM:** `4.6.0`
- **SHAP:** `0.51.0`

Other required packages include:
- `pandas`
- `numpy`
- `joblib`

---

## 4. Installation

Navigate to the backend directory:
```bash
cd backend
```

Create and activate a virtual environment if required:

**Windows**
```cmd
python -m venv .venv
.venv\Scripts\activate
```

**Linux/macOS**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

---

## 5. Requirements

The current dependency versions are:
```txt
pandas
numpy
scikit-learn==1.6.1
catboost==1.2.10
lightgbm==4.6.0
xgboost==3.2.0
shap==0.51.0
joblib
```

Verify the installed ML versions:
```bash
python -c "import xgboost, sklearn, catboost, lightgbm, shap; print('XGBoost:', xgboost.__version__); print('scikit-learn:', sklearn.__version__); print('CatBoost:', catboost.__version__); print('LightGBM:', lightgbm.__version__); print('SHAP:', shap.__version__)"
```

Expected Output:
```text
XGBoost: 3.2.0
scikit-learn: 1.6.1
CatBoost: 1.2.10
LightGBM: 4.6.0
SHAP: 0.51.0
```

---

## 6. Machine Learning Models

The backend uses a three-model stacking ensemble.

### Base Models
The ensemble contains:
- **CatBoost Regressor**
- **LightGBM Regressor**
- **XGBoost Regressor**

The predictions from these three models are passed to a Ridge regression meta-model.

### Meta Model
- **Ridge Regression**

The complete trained stacking package is stored in:
`ml_models/UC09_3Model_Stacking_Ensemble.pkl`

The package contains:
- `catboost`
- `lightgbm`
- `xgboost`
- `meta_model`
- `features`
- `target`
- `random_state`
- `n_folds`

---

## 7. Model Feature Set

The model uses exactly **54 input features**. The feature order is stored in the model package and must be preserved.

The feature names are also stored in:
`ml_models/feature_names.pkl`

<details>
<summary>Click to view all 54 features</summary>

- age
- diabetes
- hypertension
- heart_disease
- copd
- obesity
- cancer
- chronic_condition_count
- total_encounters
- ed_visits
- hospitalizations
- medication_count
- preventive_care_gap
- EP_POV150
- EP_UNEMP
- EP_HBURD
- EP_NOHSDP
- EP_UNINSUR
- EP_AGE65
- EP_AGE17
- EP_DISABL
- EP_SNGPNT
- EP_LIMENG
- EP_MINRTY
- EP_MUNIT
- EP_MOBILE
- EP_CROWD
- EP_NOVEH
- EP_GROUPQ
- RPL_THEMES
- DIABETES_AdjPrev
- OBESITY_AdjPrev
- CSMOKING_AdjPrev
- LPA_AdjPrev
- BPHIGH_AdjPrev
- HIGHCHOL_AdjPrev
- CHD_AdjPrev
- STROKE_AdjPrev
- COPD_AdjPrev
- CASTHMA_AdjPrev
- CANCER_AdjPrev
- DEPRESSION_AdjPrev
- MHLTH_AdjPrev
- PHLTH_AdjPrev
- GHLTH_AdjPrev
- ARTHRITIS_AdjPrev
- DISABILITY_AdjPrev
- INDEPLIVE_AdjPrev
- children_low_access_pct
- no_vehicle_low_access_pct
- low_income_low_access_pct
- low_food_access_pct
- seniors_low_access_pct
- gender_Male

</details>

---

## 8. Preprocessing

Preprocessing is implemented in `app/utils/preprocessing.py` and performs the following operations:

1. **Column cleanup:** Input column names are stripped of leading/trailing whitespace.
2. **FIPS normalization:** `CountyFIPS` and `StateFIPS` values are normalized to string representations with the expected zero-padding.
3. **Numeric conversion:** Model input features are converted to numeric values. Invalid values are coerced to missing (`NaN`).
4. **Missing-value handling:**
   - Handled using median-based imputation.
   - For PLACES-related features, state-level median imputation is performed when `StateFIPS` is available.
   - Remaining missing values are filled using the global median.
5. **Gender encoding:** The original gender field is converted using one-hot encoding for `gender_Male`.
6. **Feature alignment:** Missing model features are added with a default value of zero. The final dataframe is reordered according to the model's 54-feature list.

---

## 9. Prediction Service

Prediction logic is implemented in `app/services/prediction_service.py`.

The service provides:
- `predict_member(df)`: For multiple members
- `predict_single_member(row)`: For a single member

**Example:**
```python
from app.services.prediction_service import predict_single_member

result = predict_single_member(member_row)
print(result)
```

---

## 10. Stacking Ensemble

For each member, the three base models generate independent predictions. These are combined into a meta-model input:
`[CatBoost Prediction, LightGBM Prediction, XGBoost Prediction]`

The Ridge meta-model then produces the final **Combined Risk Score** (returned as a floating-point value).

---

## 11. Prediction Validation

The backend prediction was validated against the original Colab prediction using Member ID `M06253`.

- **Colab prediction:** `68.909683`
- **Backend prediction:** `68.906593`
- **Difference:** `0.003090`

*This confirms that the backend stacking implementation closely reproduces the Colab prediction.*

---

## 12. Risk Service

Risk classification is implemented in `app/services/risk_service.py`. Risk thresholds are loaded dynamically from `ml_models/risk_thresholds.json`.

**Validated risk categories:**
- `Score <= 25` → **LOW**
- `25 < Score <= 50` → **MEDIUM**
- `50 < Score <= 75` → **HIGH**
- `Score > 75` → **VERY HIGH**

---

## 13. SHAP Service

SHAP explanation logic is implemented in `app/services/shap_service.py`.

The SHAP background dataset is stored in `ml_models/shap_background.pkl`. The validated background dataset contains 100 rows × 54 features.

---

## 14. SHAP Explanation Pipeline

The SHAP service generates explanations for the three base models and aggregates their SHAP values.

The service provides:
- Combined risk score
- Base model predictions
- Feature values & SHAP values
- Risk direction (`increases_risk`, `decreases_risk`, `neutral`)
- Top risk drivers

---

## 15. SHAP Validation

SHAP functionality was validated using Member ID `M06253`.

**Example top SHAP risk drivers:**
- `ed_visits`
- `preventive_care_gap`
- `diabetes`
- `hospitalizations`
- `obesity`

Each driver includes its feature value, SHAP contribution, and risk direction.

---

## 16. Model Files

The following model artifacts are required in the `ml_models/` directory:

- `UC09_3Model_Stacking_Ensemble.pkl`: Contains the complete stacking ensemble.
- `feature_names.pkl`: Contains the model's feature names/order.
- `shap_background.pkl`: Contains the 100-row SHAP background dataset with 54 features.
- `risk_thresholds.json`: Contains the thresholds used to classify the combined risk score.

---

## 17. Testing

All tests should be executed from the `backend` directory.

- **Prediction Test**: `python tests/test_prediction.py`
- **Colab vs Backend Validation**: `python tests/test_colab_prediction.py`
- **Member-Specific Validation**: `python tests/test_member_m06253.py`
- **Preprocessing Debug Test**: `python tests/debug_preprocessing.py`
- **Stacking Debug Test**: `python tests/debug_member_stacking.py`
- **Loaded Package Inspection**: `python tests/inspect_loaded_package.py`
- **Risk Service Test**: `python tests/test_risk_service.py`
- **SHAP Background Test**: `python tests/test_shap_background.py`
- **SHAP Service Test**: `python tests/test_shap_service.py`

### Recommended Validation Sequence
```bash
python tests/test_prediction.py
python tests/test_risk_service.py
python tests/test_shap_background.py
python tests/test_shap_service.py
```

---

## 18. API Integration & Maintainer Notes

- **Preserve Feature Order:** The model expects exactly 54 features in the stored order.
- **Model Compatibility:** Do not change ML library versions without retraining the models.
- **Avoid Logic Duplication:** The API layer should call the existing backend services rather than implementing a second preprocessing or prediction pipeline.

### Backend ML Pipeline Architecture
```text
                  MEMBER DATA
                       │
                       ▼
              ┌─────────────────┐
              │  PREPROCESSING  │
              │   54 FEATURES   │
              └────────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      CatBoost      LightGBM      XGBoost
          │            │            │
          └────────────┼────────────┘
                       ▼
                Ridge Meta Model
                       │
                       ▼
             COMBINED RISK SCORE
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
       Risk Classification    SHAP Analysis
             │                   │
             ▼                   ▼
        Risk Level           Risk Drivers
```
