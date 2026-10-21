# Sprint 1 risk assessment data

- `student_academic_risk.csv` is the labeled training dataset. It contains the model features and the `academic_risk_level` target (`Low`, `Medium`, or `High`).
- Student and module assessment inputs are submitted through the client app’s **Manual Risk Input** tab and stored in the MongoDB `test.risk_inputs` collection by default. Set `MONGODB_DB_NAME` in both `python/.env` and `server/.env` to another shared database name if needed. Records are scoped by the signed-in user ID; submitting the same module code updates that user's existing record.

The Python API takes the signed-in user's ID from their login token, so client submissions are associated with that account automatically. Submitting a module runs the trained model and marks the Risk Assessment tab when the result is Medium or High. Existing entries in `manual_risk_entries.sqlite3` and the previous `research_db.risk_inputs` collection are moved to the selected database when the risk API is first used.

The manual form collects attendance, assignment and quiz scores, study hours, engagement score, late and completed assignments, and learning progress. Previous GPA remains an optional model input and is not collected by the form. The older `AI_Personalized_Learning.csv` is not used by this risk model. To choose a different training dataset path, set `RISK_TRAINING_DATA` in `python/.env`.
