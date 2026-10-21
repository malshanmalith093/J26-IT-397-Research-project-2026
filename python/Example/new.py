from pymongo import MongoClient
import pandas as pd
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "test")

client = MongoClient(MONGO_URI)

db = client[MONGODB_DB_NAME]
collection = db["users"]


# def get_data():
#     data = list(
#         collection.find(
#             {},
#             {"_id": 0}
#         )
#     )

#     df = pd.DataFrame(data)

#     return df.to_dict(orient="records")
def get_data():
    data = list(
        collection.find(
            {},
            {
                "_id": 0,
                "password": 0
            }
        )
    )

    df = pd.DataFrame(data)

    if "createdAt" in df.columns:
        df["createdAt"] = df["createdAt"].astype(str)

    return df.to_dict(orient="records")

