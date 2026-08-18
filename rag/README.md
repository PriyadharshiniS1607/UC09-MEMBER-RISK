# RAG Intervention Recommendation Pipeline

This directory contains the **Retrieval-Augmented Generation (RAG) workflow** for the Member Risk Prediction system.

The RAG pipeline uses the **already-generated member risk prediction and SHAP explanation stored in the backend database** to retrieve relevant intervention evidence and generate member-specific recommendations using Gemini.

The RAG pipeline does **not** perform CSV processing, risk prediction, or SHAP calculation.

---

## 1. Architecture

The overall system is divided into two major stages:

```text
                    BACKEND PREDICTION PIPELINE
                    ===========================

                         CSV / Member Data
                                │
                                ▼
                         Data Preprocessing
                                │
                                ▼
                         Risk Prediction
                                │
                                ▼
                         SHAP Explanation
                                │
                                ▼
                    Store Results in Database
                                │
                                │
                                ▼
                    ┌───────────────────────┐
                    │     RAG PIPELINE      │
                    └───────────────────────┘
                                │
                                ▼
                       Load Existing DB Data
                                │
                                ▼
                       Build RAG Context
                                │
                                ▼
                 Identify SHAP Intervention Drivers
                                │
                                ▼
                  Intervention-Specific Retrieval
                                │
                                ▼
                         FAISS Vector Store
                                │
                                ▼
                       Retrieved Evidence
                                │
                                ▼
                      Gemini Recommendation
                                │
                                ▼
                       Output Validation
                                │
                                ▼
                  Recommendation JSON Response
```

### Important design principle

The RAG workflow starts **after prediction and SHAP generation are complete**.

It does not repeat work already performed by the `/predict` workflow.

---

# 2. RAG Workflow

For a member such as `M00001`, the recommendation workflow is:

```text
Member ID
   │
   ▼
Database
   │
   ├── Member
   ├── RiskPrediction
   └── ShapExplanation
          │
          ▼
   RAG Context Builder
          │
          ▼
   SHAP Intervention Drivers
          │
          ▼
   Intervention Retrieval
          │
          ▼
   FAISS
          │
          ▼
   Relevant Evidence
          │
          ▼
   Gemini
          │
          ▼
   JSON Recommendation
          │
          ▼
   Validation
          │
          ▼
   Final Recommendation
```

---

# 3. Directory Structure

```text
rag/
│
├── README.md
│
├── rag_pipeline.py
│
├── requirements.txt
│
├── download_sdoh.py
├── download_usda_food_access.py
├── download_uspstf.py
│
├── documents/
│   └── Source documents / downloaded datasets
│
├── chunks/
│   └── Chunked documents
│
├── embeddings/
│   └── Generated embeddings
│
├── vectorstore/
│   └── FAISS indexes and metadata
│
├── chunking/
│   └── Document chunking logic
│
├── retrieval/
│   └── Retrieval logic
│
└── intervention/
    │
    ├── context_builder.py
    ├── intervention_retriever.py
    ├── recommendation_generator.py
    │
    └── outputs/
        └── Member recommendation JSON files
```

---

# 4. Main Components

## 4.1 Context Builder

Location:

```text
rag/intervention/context_builder.py
```

The context builder converts the existing backend database objects into a RAG-compatible context.

It uses:

* Member information
* Risk prediction
* Risk category
* SHAP explanation
* SHAP risk drivers
* Intervention driver mappings

The context builder does not generate a new prediction.

---

## 4.2 Intervention Retriever

Location:

```text
rag/intervention/intervention_retriever.py
```

The intervention retriever identifies the interventions associated with the member's SHAP drivers and retrieves supporting evidence from the FAISS vector store.

Example:

```text
SHAP feature
    │
    ▼
copd
    │
    ▼
Intervention mapping
    │
    ▼
COPD management
    │
    ▼
Evidence retrieval
    │
    ▼
Relevant document chunks
```

The retrieval process is intervention-specific rather than performing a generic search over all available documents.

---

# 5. FAISS Retrieval

FAISS is used for vector similarity search.

The RAG system stores document chunks as embeddings and retrieves the most relevant evidence for each intervention.

Conceptually:

```text
Documents
    │
    ▼
Chunking
    │
    ▼
Text Chunks
    │
    ▼
Embeddings
    │
    ▼
FAISS Vector Store
```

At recommendation time:

```text
Intervention Query
       │
       ▼
Query Embedding
       │
       ▼
FAISS Similarity Search
       │
       ▼
Top Relevant Evidence
```

The similarity score is used for retrieval ranking.

It is **not treated as proof of clinical appropriateness**.

---

# 6. Evidence Sources

The RAG workflow can use evidence from sources such as:

* Healthy People 2030
* USPSTF
* USDA Food Access Research Atlas
* Other approved evidence/document sources

The source metadata is retained with each retrieved chunk.

Typical metadata includes:

```json
{
  "source": "Healthy People 2030",
  "domain": "environmental_conditions",
  "topic": "environmental_conditions",
  "document": "environmental_conditions.json",
  "chunk_id": "environmental_conditions.json__chunk_6"
}
```

This metadata is used to ensure that recommendations only reference evidence actually retrieved from the RAG system.

---

# 7. Gemini Recommendation Generation

The recommendation generator is located at:

```text
rag/intervention/recommendation_generator.py
```

Gemini receives the completed RAG context containing:

```text
Member information
+
Risk prediction
+
SHAP explanation
+
Intervention drivers
+
Retrieved evidence
```

Gemini does **not** perform:

* CSV processing
* Data preprocessing
* Risk prediction
* SHAP calculation
* FAISS retrieval
* Database prediction creation

Its responsibility is to convert the supplied context into a structured recommendation.

---

# 8. Recommendation Generation

The recommendation output follows this structure:

```json
{
  "member_id": "M00001",
  "risk_summary": {
    "risk_score": 34.356,
    "risk_category": "MEDIUM",
    "summary": "..."
  },
  "recommendations": [
    {
      "priority": "high",
      "feature": "copd",
      "concept": "COPD management",
      "domain": "clinical",
      "shap_impact": 5.0589,
      "rationale": "...",
      "recommended_action": "...",
      "next_step": "...",
      "evidence_basis": "...",
      "evidence_sources": [
        {
          "source": "Healthy People 2030",
          "domain": "...",
          "topic": "...",
          "document": "...",
          "chunk_id": "...",
          "score": 0.385
        }
      ]
    }
  ]
}
```

---

# 9. Recommendation Validation

The recommendation generator validates Gemini's output against the actual retrieved context.

The validation layer prevents the model from introducing:

* Unknown SHAP features
* Unknown intervention features
* Fabricated evidence
* Fabricated chunk IDs
* Fabricated source metadata
* Evidence that was not retrieved

For example, if the retriever only provides:

```text
chunk_id = environmental_conditions.json__chunk_6
```

Gemini cannot introduce an unrelated chunk ID.

The validator replaces LLM-generated evidence metadata with the actual metadata returned by retrieval.

---

# 10. Safety and Grounding

The recommendation generator follows conservative grounding rules.

It must not:

* Invent diagnoses
* Invent medications
* Provide medication dosages
* Invent laboratory values
* Invent patient history
* Assume a condition when its supplied value is `0`
* Fabricate social determinants
* Fabricate evidence
* Fabricate sources
* Treat FAISS similarity as clinical proof

SHAP is used to identify important risk drivers, but a SHAP contribution does not automatically mean that an intervention is clinically required.

When the available information is insufficient, the recommendation should favor:

```text
Clinician review
Care-team review
Further assessment
Referral consideration
```

rather than making unsupported assumptions.

---

# 11. Environment Variables

Create a `.env` file in the project root.

Example:

```text
GEMINI_API_KEY=your_gemini_api_key
```

Do not commit `.env` to Git.

The API key must remain private.

---

# 12. Installing RAG Dependencies

From the project root:

```powershell
pip install -r rag/requirements.txt
```

If the project uses a virtual environment, activate it first.

Example:

```powershell
.\venv\Scripts\activate
```

Then:

```powershell
pip install -r rag/requirements.txt
```

---

# 13. Running the RAG Recommendation Generator

The recommendation generator accepts a member ID.

Example:

```powershell
python rag/intervention/recommendation_generator.py M00001
```

The workflow performs:

```text
1. Load member from database
2. Load latest risk prediction
3. Load corresponding SHAP explanation
4. Build RAG context
5. Identify intervention drivers
6. Retrieve evidence from FAISS
7. Send context to Gemini
8. Parse Gemini JSON
9. Validate recommendations
10. Display final recommendations
11. Save recommendation JSON
```

---

# 14. Output

Generated recommendations are stored under:

```text
rag/intervention/outputs/
```

For example:

```text
rag/intervention/outputs/M00001_recommendations.json
```

The generated JSON contains the validated recommendation result.

---

# 15. Example Execution

Example:

```text
================================================================================
GEMINI RAG RECOMMENDATION GENERATOR
================================================================================

Generating recommendation for member: M00001

Loading existing prediction data from database...

DATABASE CONTEXT LOADED
--------------------------------------------------------------------------------
Member ID: M00001
Risk score: 34.35608129091592
Risk category: MEDIUM
Prediction ID: 148
SHAP ID: 99

Building RAG context from existing database data...

RAG CONTEXT BUILT

Running intervention-specific FAISS retrieval...

RETRIEVAL COMPLETED
--------------------------------------------------------------------------------
copd | COPD management | evidence=6

Calling Gemini...

GEMINI RAG INTERVENTION RECOMMENDATIONS
================================================================================
```

The final output contains prioritized recommendations based on the supplied SHAP drivers and retrieved evidence.

---

# 16. Relationship With Backend

The intended system architecture is:

```text
                 BACKEND
                   │
                   ▼
              POST /predict
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
     Risk Prediction      SHAP
          │                 │
          └────────┬────────┘
                   │
                   ▼
                Database
                   │
                   │
                   ▼
             RAG Workflow
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
      DB Context       FAISS Evidence
          │                 │
          └────────┬────────┘
                   ▼
                Gemini
                   │
                   ▼
          Recommendation JSON
```

The important separation is:

```text
/predict
    ↓
Prediction + SHAP + Database

RAG
    ↓
Database + FAISS + Gemini
    ↓
Recommendation
```

The RAG pipeline should consume the prediction results rather than recreate them.

---

# 17. Future Backend Integration

The RAG workflow can later be exposed through a backend API.

For example:

```text
GET /recommendation/{member_id}
```

Possible flow:

```text
GET /recommendation/M00001
            │
            ▼
     Load DB prediction
            │
            ▼
      Build RAG context
            │
            ▼
   Retrieve intervention evidence
            │
            ▼
          Gemini
            │
            ▼
    Validate recommendation
            │
            ▼
       API JSON response
```

This keeps the backend prediction API and recommendation workflow logically separated.

---

# 18. Current Scope

The current RAG workflow is responsible for:

* Existing database context loading
* SHAP-driven intervention identification
* Intervention-specific retrieval
* FAISS evidence retrieval
* Gemini recommendation generation
* Recommendation validation
* Structured JSON output

It is **not responsible for**:

* CSV upload
* Member creation
* Data preprocessing
* Risk model training
* Risk prediction
* SHAP calculation
* Authentication
* Backend API implementation

Those responsibilities belong to the backend application.

---

# 19. Development Principle

The RAG workflow follows the principle:

> **Predict once, explain once, store once, retrieve later, recommend from stored context.**

This prevents duplicate prediction/SHAP computation and allows the recommendation system to use the already-generated member risk information.

---

# 20. Status

The current RAG pipeline is operational with:

* Database-backed member context
* Existing risk prediction
* Existing SHAP explanation
* Intervention-specific retrieval
* FAISS vector search
* Evidence grounding
* Gemini recommendation generation
* Recommendation validation
* JSON output

The next stage is integration of this workflow with the backend API.
