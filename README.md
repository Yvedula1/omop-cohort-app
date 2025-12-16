## Docker Images

The application is fully containerized and published on Docker Hub.

-Docker Hub: https://hub.docker.com/u/yvedula
- Frontend: https://hub.docker.com/r/yvedula/omop-frontend
- Backend: https://hub.docker.com/r/yvedula/omop-backend
  

### Run the application

```bash
docker compose up --build


--------------------------------------------------------------------------------------

OMOP Tables Used

The following OMOP CDM v5.4 tables were used to construct disease and non-disease cohorts and to extract outcome measurements:

1. person

Used as the base population.

Provides one row per individual (person_id).

Demographic fields such as year_of_birth and gender_concept_id were used for age-group and sex-based comparisons.

2. condition_occurrence (Required)

Used to identify whether a person has the disease of interest.

The condition_concept_id field was matched against disease-related concept IDs.

Multiple condition records per person were collapsed using aggregation logic.

3. measurement (Required)

Used to extract outcome variables for both disease and non-disease cohorts.

The following measurements were selected as outcomes:

Hemoglobin [Mass/volume] in Blood (concept_id = 3000963)

Glucose [Mass/volume] in Serum or Plasma (concept_id = 3004501)

Only numeric measurements (value_as_number IS NOT NULL) were included.

4. concept

Used to identify disease concepts by ICD codes.

Used to label measurement concept IDs with human-readable names.

5. concept_relationship

Used to map ICD source concepts to standard concepts using the "Maps to" relationship.

6. concept_ancestor

Used to retrieve all descendant concepts for a disease.

Ensures that all clinical subtypes of the disease are included in the cohort.

Cohort Construction Logic
Disease of Interest

The disease cohort was constructed for Diabetes Mellitus, using the following ICD codes provided in the assessment:

ICD-9: 250

ICD-10: E08, E09, E10, E11, E13

Step 1: Identify Standard Disease Concepts

ICD source concepts were mapped to standard SNOMED concepts using the concept_relationship table (relationship_id = 'Maps to').

Only standard concepts (standard_concept = 'S') were retained.

Step 2: Expand to All Descendants

The concept_ancestor table was used to retrieve all descendant concept IDs for the mapped standard disease concepts.

This ensures inclusion of all clinical variations and subtypes of diabetes.

Step 3: Disease vs Non-Disease Classification

Each person was evaluated based on their records in condition_occurrence:

Disease cohort: Person has at least one condition occurrence whose condition_concept_id belongs to the descendant set.

Non-disease cohort: Person has no matching condition occurrences.

Aggregation using MAX() was applied so each person is classified once.

Step 4: Outcome Measurement Extraction

Outcome measurements (Hemoglobin and Glucose) were extracted from the measurement table for both cohorts.

Measurements were linked to cohort membership using person_id.

The same measurement logic was applied uniformly to disease and non-disease groups to ensure fair comparison.

Summary

Cohorts were built using standardized OMOP vocabulary relationships, not hard-coded concept IDs.

Disease classification was based on clinical conditions, not measurements.

Measurements were treated strictly as outcomes, not cohort-defining variables.

The logic aligns with best practices recommended by OHDSI for cohort construction.
The cohort was constructed using the OMOP SynPUF dataset containing approximately 100,000 synthetic patients. Disease and non-disease cohorts were successfully derived using condition-based logic; however, outcome measurements (Glucose and Hemoglobin) were sparse or unavailable for many patients in this dataset. This behavior is expected, as SynPUF is a claims-focused synthetic dataset with limited laboratory measurement coverage. The application therefore returns empty outcome results for some cohorts and explicitly reflects this in the UI, ensuring transparency and accurately mirroring real-world clinical data incompleteness while preserving correct cohort construction logic.

