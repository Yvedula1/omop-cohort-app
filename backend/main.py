from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import duckdb
from pathlib import Path
from datetime import datetime

# ----------------------------
# App setup
# ----------------------------
app = FastAPI(title="OMOP Cohort API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------
# Paths
# ----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "omop.duckdb"

# ----------------------------
# DB connection
# ----------------------------
con = duckdb.connect(str(DB_PATH))

# ----------------------------
# Constants
# ----------------------------
DIABETES_ICD_CODES = ('250', 'E08', 'E09', 'E10', 'E11', 'E13')

GLUCOSE_ID = 3004501
HEMOGLOBIN_ID = 3000963

MALE_ID = 8507
FEMALE_ID = 8532

# ----------------------------
# Helper SQL
# ----------------------------
def _sql_in(vals):
    return "(" + ",".join([f"'{v}'" for v in vals]) + ")"

def diabetes_standard_concepts():
    return f"""
        SELECT DISTINCT c2.concept_id
        FROM concept c1
        JOIN concept_relationship cr ON c1.concept_id = cr.concept_id_1
        JOIN concept c2 ON cr.concept_id_2 = c2.concept_id
        WHERE cr.relationship_id = 'Maps to'
          AND c1.concept_code IN {_sql_in(DIABETES_ICD_CODES)}
          AND c2.standard_concept = 'S'
    """

def diabetes_descendants():
    return f"""
        SELECT descendant_concept_id
        FROM concept_ancestor
        WHERE ancestor_concept_id IN ({diabetes_standard_concepts()})
    """

def diabetes_flag_sql():
    return f"""
        SELECT
            p.person_id,
            MAX(
                CASE
                    WHEN co.condition_concept_id IN ({diabetes_descendants()})
                    THEN 1 ELSE 0
                END
            ) AS is_disease
        FROM person p
        LEFT JOIN condition_occurrence co
               ON p.person_id = co.person_id
        GROUP BY p.person_id
    """

def age_group_sql():
    year = datetime.now().year
    return f"""
        CASE
            WHEN {year} - p.year_of_birth < 20 THEN '<20'
            WHEN {year} - p.year_of_birth BETWEEN 20 AND 39 THEN '20–40'
            WHEN {year} - p.year_of_birth BETWEEN 40 AND 59 THEN '40–60'
            ELSE '60+'
        END
    """

# ----------------------------
# Health
# ----------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# ----------------------------
# Diseases (dropdown)
# ----------------------------
@app.get("/diseases")
def diseases():
    return {
        "diseases": [
            {"key": "diabetes", "label": "Diabetes"}
        ]
    }

# ----------------------------
# 1️⃣ Cohort counts
# ----------------------------
@app.get("/cohort/diabetes/patients")
def diabetes_patients():
    rows = con.execute(diabetes_flag_sql()).fetchall()

    case_count = sum(r[1] for r in rows)
    total = len(rows)

    return {
        "total_people": total,
        "case_count": case_count,
        "control_count": total - case_count
    }

# ----------------------------
# 2️⃣ Age-group × Sex distribution
# ----------------------------
@app.get("/cohort/diabetes/age-sex")
def diabetes_age_sex():
    rows = con.execute(f"""
        WITH flags AS (
            {diabetes_flag_sql()}
        )
        SELECT
            CASE WHEN f.is_disease = 1 THEN 'Disease' ELSE 'Non-Disease' END AS cohort,
            CASE
                WHEN p.gender_concept_id = {MALE_ID} THEN 'Male'
                WHEN p.gender_concept_id = {FEMALE_ID} THEN 'Female'
                ELSE 'Other'
            END AS sex,
            {age_group_sql()} AS age_group,
            COUNT(*) AS count
        FROM flags f
        JOIN person p ON f.person_id = p.person_id
        GROUP BY cohort, sex, age_group
        ORDER BY cohort, sex, age_group
    """).fetchall()

    return {
        "rows": [
            {
                "cohort": r[0],
                "sex": r[1],
                "age_group": r[2],
                "count": r[3]
            }
            for r in rows
        ]
    }

# ----------------------------
# 3️⃣ Outcomes (Box plot data)
# ----------------------------
@app.get("/cohort/diabetes/outcomes")
def diabetes_outcomes(
    measurement_id: int = Query(...),
    limit: int = 5000
):
    if measurement_id not in (GLUCOSE_ID, HEMOGLOBIN_ID):
        return {"rows": []}

    rows = con.execute(f"""
        WITH flags AS (
            {diabetes_flag_sql()}
        )
        SELECT
            CASE WHEN f.is_disease = 1 THEN 'Disease' ELSE 'Non-Disease' END AS cohort,
            m.value_as_number
        FROM flags f
        JOIN measurement m ON f.person_id = m.person_id
        WHERE m.measurement_concept_id = {measurement_id}
          AND m.value_as_number IS NOT NULL
        LIMIT {limit}
    """).fetchall()

    return {
        "rows": [
            {"cohort": r[0], "value": r[1]}
            for r in rows
        ]
    }

# ----------------------------
# 4️⃣ Summary statistics (optional API)
# ----------------------------
@app.get("/cohort/diabetes/summary-stats")
def diabetes_summary_stats(
    measurement_id: int = Query(...)
):
    rows = con.execute(f"""
        WITH flags AS (
            {diabetes_flag_sql()}
        )
        SELECT
            CASE WHEN f.is_disease = 1 THEN 'Disease' ELSE 'Non-Disease' END AS cohort,
            m.value_as_number
        FROM flags f
        JOIN measurement m ON f.person_id = m.person_id
        WHERE m.measurement_concept_id = {measurement_id}
          AND m.value_as_number IS NOT NULL
    """).fetchall()

    import numpy as np
    from collections import defaultdict

    groups = defaultdict(list)
    for cohort, val in rows:
        groups[cohort].append(val)

    def stats(vals):
        if not vals:
            return {"n": 0, "median": None, "p25": None, "p75": None}
        arr = np.array(vals)
        return {
            "n": len(arr),
            "median": float(np.median(arr)),
            "p25": float(np.percentile(arr, 25)),
            "p75": float(np.percentile(arr, 75)),
        }

    return {
        cohort: stats(vals)
        for cohort, vals in groups.items()
    }
