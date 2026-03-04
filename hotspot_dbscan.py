import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN

# ===============================
# LOAD ACCIDENT DATASET
# ===============================
df = pd.read_csv("andhra_pradesh_traffic_accidents_70k_realistic.csv")

# ===============================
# KEEP REQUIRED COLUMNS
# ===============================
df = df[["latitude", "longitude", "accident_severity"]]

# ===============================
# SEVERITY WEIGHTING
# ===============================
severity_weight = {
    "Minor": 1,
    "Serious": 3,
    "Fatal": 5
}

df["severity_score"] = df["accident_severity"].map(severity_weight)

# ===============================
# PREPARE COORDINATES
# ===============================
coords = np.radians(df[["latitude", "longitude"]])

# ===============================
# DBSCAN CLUSTERING
# eps = 0.5 km
# min_samples = 10 accidents
# ===============================
dbscan = DBSCAN(
    eps=0.5 / 6371,   # convert km → radians
    min_samples=10,
    metric="haversine"
)

df["cluster"] = dbscan.fit_predict(coords)

# ===============================
# REMOVE NOISE POINTS
# ===============================
df = df[df["cluster"] != -1]

# ===============================
# AGGREGATE CLUSTERS → HOTSPOTS
# ===============================
hotspots = (
    df.groupby("cluster")
      .agg(
          latitude=("latitude", "mean"),
          longitude=("longitude", "mean"),
          accident_count=("cluster", "count"),
          risk_score=("severity_score", "sum")
      )
      .reset_index(drop=True)
)

# ===============================
# SAVE HOTSPOTS
# ===============================
hotspots.to_csv("hotspots_dbscan.csv", index=False)

print("✅ DBSCAN Hotspots Generated:", len(hotspots))
