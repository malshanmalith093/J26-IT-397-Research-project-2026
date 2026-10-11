import matplotlib.pyplot as plt
import pandas as pd
from pymongo import MongoClient
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

MONGO_URI = "mongodb+srv://Sinathra:H%40nsani2001@cluster1.imb7o.mongodb.net/stock_db?retryWrites=true&w=majority&appName=Cluster1"

client = MongoClient(MONGO_URI)

db = client["stock_db"]
collection = db["students"]

features = [
    'learning_trend',
    'time_spent_minutes',
    'quiz_score',
    'attempts_taken',
    'assignment_score',
    'days_since_last_activity',
    'attention_score'
]

def calculate_student_clusters():

    data = list(
    collection.find(
        {},
        {"_id": 0}
    )
)

    df = pd.DataFrame(data)

    student_data = (
                df.groupby('student_id')[features]
                .mean()
                .dropna()
                .reset_index()
            )
    # Select data
    #X = df[features].dropna()
    X = student_data[features]

    
    # Standardize
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # K-Means
    kmeans = KMeans(n_clusters=2, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X_scaled)

    #df.loc[X.index, 'cluster'] = clusters
    student_data['cluster'] = clusters

    # PCA → 2 dimensions for visualization
    # pca = PCA(n_components=2)
    # X_pca = pca.fit_transform(X_scaled)

    # Plot clusters
    # plt.figure(figsize=(9, 6))

    # for cluster in range(2):
    #     plt.scatter(
    #         X_pca[clusters == cluster, 0],
    #         X_pca[clusters == cluster, 1],
    #         label=f'Cluster {cluster + 1}'
    #      )

    # plt.xlabel('Principal Component 1')
    # plt.ylabel('Principal Component 2')
    # plt.title('Student Clusters Based on Learning Behavior')
    # plt.legend()
    # plt.grid(True, alpha=0.3)
    # plt.show()
    

    # cluster_profile = (
    #     student_data
    #     .groupby('cluster')[features]
    #     .mean()
    # )

    # print(cluster_profile)

    result = student_data[
            ["student_id", "cluster"]
        ].to_dict(orient="records")

    return result