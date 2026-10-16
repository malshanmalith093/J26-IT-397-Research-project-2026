from pymongo import MongoClient
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)

db = client["stock_db"]
collection = db["students"]


def get_student_data():
    data = list(
        collection.find(
            {},
            {"_id": 0}
        )
    )

    df = pd.DataFrame(data)

    #return df.to_dict(orient="records")
    if df.empty:
        return []

    df["module_id"] = (
        df["module_id"]
        .astype(str)
        .str.strip()
    )


   
    df["quiz_score"] = pd.to_numeric(
        df["quiz_score"],
        errors="coerce"
    )

    df["assignment_score"] = pd.to_numeric(
        df["assignment_score"],
        errors="coerce"
    )

    df["attention_score"] = pd.to_numeric(
        df["attention_score"],
        errors="coerce"
    )

    module_state = (
    df.groupby(['student_id', 'module_id'])
      .agg(
          quiz_score=('quiz_score', 'mean'),
          assignment_score=('assignment_score', 'mean'),
          attention_score=('attention_score', 'mean')
      )
      .reset_index()
)

    module_state['quiz_weakness'] = 100 - module_state['quiz_score']

    module_state['assignment_weakness'] = (
    100 - module_state['assignment_score']
)

    module_state['attention_weakness'] = (
    100 - module_state['attention_score']
)

    module_state['weakness_score'] = (
    0.5 * module_state['quiz_weakness'] +
    0.3 * module_state['assignment_weakness'] +
    0.2 * module_state['attention_weakness']
)

    module_state['priority_rank'] = (
    module_state
    .groupby('student_id')['weakness_score']
    .rank(method='dense', ascending=False)
)

    ascending=False

    priority_output = module_state.sort_values(
    ['student_id', 'priority_rank']
)

    # Display selected columns
    print(
    priority_output[
        [
            'student_id',
            'module_id',
            'quiz_score',
            'assignment_score',
            'attention_score',
            'weakness_score',
            'priority_rank'
        ]
    ]
)

    df = df.merge(
    priority_output,
    on=["student_id", "module_id"],
    how="left"
)

    #return df.to_dict(orient="records")


    # print(
    #     priority_output.to_string(index=False)
    # )

    # return priority_output.to_dict(
    #     orient="records"
    # )

#return priority_output.to_dict(
 #       orient="records"
#    )

    records = df.to_dict(orient="records")

    cleaned_records = []

    for record in records:

        cleaned_record = {}

        for key, value in record.items():

            if value is None:
                cleaned_record[key] = None

            elif isinstance(value, (float, np.floating)):
                if np.isnan(value) or np.isinf(value):
                    cleaned_record[key] = None
                else:
                    cleaned_record[key] = float(value)

            elif pd.isna(value):
                cleaned_record[key] = None

            else:
                cleaned_record[key] = value

        cleaned_records.append(cleaned_record)

    return cleaned_records