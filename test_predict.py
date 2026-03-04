import json
from app import app

test_data = {
    'latitude': 17.3850,
    'longitude': 78.4867,
    'hour': 14,
    'day': 7,
    'month': 2,
    'day_of_week': 4,
    'weather': 'Clear',
    'traffic_density': 'Medium',
    'road_type': 'Urban'
}

# Create test client
client = app.test_client()

# Make request with session
response = client.post(
    '/predict',
    data=json.dumps(test_data),
    content_type='application/json',
    environ_base={'HTTP_COOKIE': 'session=.eJyrVkktLkktSsxRyMovzFFKzk8pzywpBgAzJADd'}
)

print('Status:', response.status_code)
resp_json = response.get_json()
print('Response:', json.dumps(resp_json, indent=2))

# Now test without session requirement temporarily
# Let's check what the actual error is by looking at the features
print("\n--- Testing feature construction ---")
from app import weather_map, traffic_map, road_map, model
import pandas as pd

features = pd.DataFrame([{
    "latitude": float(test_data["latitude"]),
    "longitude": float(test_data["longitude"]),
    "hour": int(test_data["hour"]),
    "day": int(test_data["day"]),
    "month": int(test_data["month"]),
    "day_of_week": int(test_data["day_of_week"]),
    "weather": weather_map.get(test_data["weather"], 0),
    "traffic_density": traffic_map.get(test_data["traffic_density"], 1),
    "road_type": road_map.get(test_data["road_type"], 2)
}])

print("Features:")
print(features)
print("\nFeature columns:", features.columns.tolist())
print("Feature values:")
print(features.values)

try:
    prediction = model.predict(features)
    print(f"\nPrediction successful: {prediction}")
except Exception as e:
    print(f"\nPrediction error: {e}")
    import traceback
    traceback.print_exc()
