import duckdb
from datetime import date
import random

def create_and_seed_mini_omop(con: duckdb.DuckDBPyConnection):
    # ---------- PERSON ----------
    con.execute("""
    CREATE TABLE IF NOT EXISTS person (
        person_id INTEGER,
        gender_concept_id INTEGER,
        year_of_birth INTEGER
    )
    """)

    # ---------- CONDITION ----------
    con.execute("""
    CREATE TABLE IF NOT EXISTS condition_occurrence (
        condition_occurrence_id INTEGER,
        person_id INTEGER,
        condition_concept_id INTEGER,
        condition_start_date DATE
    )
    """)

    # ---------- MEASUREMENT ----------
    con.execute("""
    CREATE TABLE IF NOT EXISTS measurement (
        measurement_id INTEGER,
        person_id INTEGER,
        measurement_concept_id INTEGER,
        value_as_number DOUBLE,
        measurement_date DATE
    )
    """)

    # ---------- CONCEPT ----------
    con.execute("""
    CREATE TABLE IF NOT EXISTS concept (
        concept_id INTEGER,
        concept_code VARCHAR,
        standard_concept VARCHAR
    )
    """)

    # ---------- CONCEPT_RELATIONSHIP ----------
    con.execute("""
    CREATE TABLE IF NOT EXISTS concept_relationship (
        concept_id_1 INTEGER,
        concept_id_2 INTEGER,
        relationship_id VARCHAR
    )
    """)

    # ---------- CONCEPT_ANCESTOR ----------
    con.execute("""
    CREATE TABLE IF NOT EXISTS concept_ancestor (
        ancestor_concept_id INTEGER,
        descendant_concept_id INTEGER
    )
    """)

    # ---------- SEED DATA ----------
    con.execute("DELETE FROM person")
    con.execute("DELETE FROM condition_occurrence")
    con.execute("DELETE FROM measurement")
    con.execute("DELETE FROM concept")
    con.execute("DELETE FROM concept_relationship")
    con.execute("DELETE FROM concept_ancestor")

    # Persons
    persons = []
    for pid in range(1, 21):
        gender = random.choice([8507, 8532])  # Male / Female
        yob = random.choice([1965, 1975, 1985, 1995])
        persons.append((pid, gender, yob))

    con.executemany("INSERT INTO person VALUES (?, ?, ?)", persons)

    # Concepts
    con.executemany(
        "INSERT INTO concept VALUES (?, ?, ?)",
        [
            (201826, "E11", "S"),        # Diabetes
            (3004501, "GLU", "S"),       # Glucose
            (3000963, "HGB", "S"),       # Hemoglobin
        ]
    )

    # Concept relationships (ICD → standard)
    for icd in ['250', 'E08', 'E09', 'E10', 'E11', 'E13']:
        con.execute(
            "INSERT INTO concept_relationship VALUES (?, ?, 'Maps to')",
            (hash(icd) % 100000, 201826)
        )

    # Ancestor
    con.execute(
        "INSERT INTO concept_ancestor VALUES (201826, 201826)"
    )

    # Conditions (first half diabetic)
    cid = 1
    for p in persons[:10]:
        con.execute(
            "INSERT INTO condition_occurrence VALUES (?, ?, ?, ?)",
            (cid, p[0], 201826, date(2020, 1, 1))
        )
        cid += 1

    # Measurements
    mid = 1
    for p in persons:
        for _ in range(2):
            val = random.uniform(85, 160)
            con.execute(
                "INSERT INTO measurement VALUES (?, ?, ?, ?, ?)",
                (mid, p[0], 3004501, val, date(2021, 1, 1))
            )
            mid += 1
