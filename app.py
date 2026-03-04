from flask import Flask, request, jsonify, render_template, redirect, session
from flask_cors import CORS
import sqlite3
from datetime import datetime
import requests
import os
import pandas as pd
import joblib
import subprocess

# ===============================
# FLASK SETUP
# ===============================
app = Flask(__name__)
app.secret_key = "supersecretkey"
CORS(app)

BASE_PATH = r"C:/Users/bugat/Downloads/traffic_accident_prevention"

DATASET_PATH = os.path.join(
    BASE_PATH,
    "andhra_pradesh_traffic_accidents_70k_realistic.csv"
)

HOTSPOT_SCRIPT = os.path.join(BASE_PATH, "hotspot_dbscan.py")
HOTSPOT_CSV = os.path.join(BASE_PATH, "hotspots_dbscan.csv")

N8N_WEBHOOK_URL = "http://localhost:5678/webhook/3008e5a7-8797-45ca-ab17-ffad35417f5a"

# ===============================
# DATABASE (USERS ONLY)
# ===============================
def init_db():
    conn = sqlite3.connect("users.db")
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            password TEXT,
            role TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ===============================
# LOAD ML MODEL
# ===============================
# ===============================
# LOAD ML MODEL
# ===============================
model = joblib.load(os.path.join(BASE_PATH, "xgboost_accident_model.pkl"))
weather_encoder = joblib.load(os.path.join(BASE_PATH, "weather_encoder.pkl"))
traffic_encoder = joblib.load(os.path.join(BASE_PATH, "traffic_encoder.pkl"))
road_encoder = joblib.load(os.path.join(BASE_PATH, "road_encoder.pkl"))

# 🔍 DEBUG: Check encoder categories (ADD HERE)
print("Weather classes:", weather_encoder.classes_)
print("Traffic classes:", traffic_encoder.classes_)
print("Road classes:", road_encoder.classes_)


severity_map = {
    0: "Minor",
    1: "Serious",
    2: "Fatal"
}

# ===============================
# LOAD HOTSPOTS
# ===============================
def load_hotspots():
    if os.path.exists(HOTSPOT_CSV):
        return pd.read_csv(HOTSPOT_CSV).to_dict(orient="records")
    return []

HOTSPOTS = load_hotspots()

# ===============================
# LIVE CONTEXT DATA (REAL-TIME)
# ===============================

def get_live_weather(lat, lon):
    """
    Returns ONLY encoder-supported labels:
    Clear, Cloudy, Foggy, Rainy
    """
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true"
        res = requests.get(url, timeout=5).json()
        code = res["current_weather"]["weathercode"]

        # 🔥 STRICT mapping to encoder classes
        if code == 0:
            return "Clear"
        elif code in [1, 2, 3]:
            return "Cloudy"
        elif code in [45, 48]:
            return "Foggy"   # MUST be Foggy (not Fog)
        elif code in [51, 61, 63, 80, 81]:
            return "Rainy"   # MUST be Rainy (not Rain)
        else:
            return "Clear"   # safe fallback (valid class)

    except Exception as e:
        print("Weather API Error:", e)
        return "Clear"


def estimate_traffic_density(hour):
    if 8 <= hour <= 11 or 17 <= hour <= 21:
        return "High"
    elif 12 <= hour <= 16:
        return "Medium"
    else:
        return "Low"


def get_road_type(lat, lon):
    """
    Map road type EXACTLY to dataset labels:
    Residential, Highway, Urban
    """
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
        headers = {"User-Agent": "traffic-accident-app-bugatHQ/2.0"}
        res = requests.get(url, headers=headers, timeout=5).json()

        address = res.get("address", {})
        road = address.get("road", "").lower()

        # 🔥 Map to dataset categories only
        if "highway" in road or "nh" in road:
            return "Highway"
        elif "street" in road or "residential" in road:
            return "Residential"
        else:
            return "Urban"  # Safe fallback (exists in dataset)

    except Exception as e:
        print("Road API Error:", e)
        return "Urban"

# ===============================
# PLACE TO COORDINATES (GEOCODING)
# ===============================
def get_coordinates_from_place(place_name):
    """
    Convert place name (e.g., Vizag, Hyderabad) to latitude & longitude
    using Open-Meteo (Primary) and OpenStreetMap (Fallback)
    """
    # Attempt 1: Nominatim OpenStreetMap (Supports colloquial names like 'Vizag')
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={place_name}&format=json&limit=1"
        # Bypassing 403 Forbidden by using a standard browser User-Agent
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"}
        res = requests.get(url, headers=headers, timeout=5)
        res.raise_for_status()
        data = res.json()

        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            return lat, lon
    except Exception as e:
        print("Nominatim Geocoding Error:", e)

    # Attempt 2: Open-Meteo Geocoding API (Fallback, strict matching only)
    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={place_name}&count=1"
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
        
        if "results" in data and len(data["results"]) > 0:
            lat = float(data["results"][0]["latitude"])
            lon = float(data["results"][0]["longitude"])
            return lat, lon
    except Exception as e:
        print("Open-Meteo Geocoding Error:", e)

    print(f"Geocoding: No results found for '{place_name}'")
    return None, None


# ===============================
# N8N ALERT
# ===============================
def trigger_n8n_alert(lat, lon):
    payload = {
        "danger": True,
        "latitude": lat,
        "longitude": lon,
        "user_email": session.get("email"),
        "phone": session.get("phone"),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    try:
        requests.post(N8N_WEBHOOK_URL, json=payload, timeout=5)
    except Exception as e:
        print("⚠️ n8n error:", e)

def safe_encode(encoder, value, fallback):
    """
    Ensures value is inside encoder classes
    """
    if value not in encoder.classes_:
        print(f"⚠️ '{value}' not in encoder classes. Using fallback: {fallback}")
        value = fallback
    return encoder.transform([value])[0]


# ===============================
# AUTH ROUTES
# ===============================
@app.route("/signup", methods=["GET", "POST"])
def signup():
    if request.method == "POST":
        try:
            conn = sqlite3.connect("users.db")
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
                (
                    request.form["name"],
                    request.form["email"],
                    request.form["phone"],
                    request.form["password"],
                    request.form["role"]
                )
            )
            conn.commit()
            conn.close()
            return redirect("/login")
        except:
            return render_template("signup.html", error="Email already exists")
    return render_template("signup.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        conn = sqlite3.connect("users.db")
        cur = conn.cursor()
        cur.execute(
            "SELECT name, role, phone FROM users WHERE email=? AND password=?",
            (request.form["email"], request.form["password"])
        )
        user = cur.fetchone()
        conn.close()

        if user:
            session["user"] = user[0]
            session["role"] = user[1]
            session["phone"] = user[2]
            session["email"] = request.form["email"]
            return redirect("/admin" if user[1] == "admin" else "/")
        return render_template("login.html", error="Invalid login credentials")
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")

# ===============================
# PAGES
# ===============================
@app.route("/")
def home():
    if "user" not in session:
        return redirect("/login")
    return render_template("index.html", user=session["user"])

@app.route("/admin")
def admin():
    if session.get("role") != "admin":
        return "⛔ Access Denied", 403
    return render_template("admin_dashboard.html", user=session["user"])

# ===============================
# ADD ACCIDENT (CSV ONLY)
# ===============================
@app.route("/admin/add-accident", methods=["GET", "POST"])
def add_accident():
    if session.get("role") != "admin":
        return "⛔ Access Denied", 403

    if request.method == "POST":
        new_row = {
            "latitude": float(request.form["latitude"]),
            "longitude": float(request.form["longitude"]),
            "date_time": datetime.now().strftime("%d-%m-%Y %H:%M"),
            "weather": "Unknown",
            "traffic_density": "Medium",
            "road_type": "Urban",
            "accident_severity": request.form["accident_severity"]
        }

        if os.path.exists(DATASET_PATH):
            df = pd.read_csv(DATASET_PATH)
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        else:
            df = pd.DataFrame([new_row])

        df.to_csv(DATASET_PATH, index=False)
        print("✅ Accident added to CSV")

        return redirect("/admin")

    return render_template("add_accident.html")

# ===============================
# RECOMPUTE HOTSPOTS
# ===============================
@app.route("/admin/recompute-hotspots")
def recompute_hotspots():
    if session.get("role") != "admin":
        return "⛔ Access Denied", 403

    subprocess.run(["python", HOTSPOT_SCRIPT], check=True)

    global HOTSPOTS
    HOTSPOTS = load_hotspots()

    return redirect("/hotspots")

# ===============================
# ADMIN ANALYTICS API
# ===============================
# ===============================
# ADMIN ANALYTICS PAGE
# ===============================
@app.route("/admin/analytics")
def admin_analytics():
    if session.get("role") != "admin":
        return "⛔ Access Denied", 403
    return render_template("admin_analytics.html", user=session["user"])


@app.route("/admin/analytics-data")
def analytics_data():
    if session.get("role") != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    if not os.path.exists(DATASET_PATH):
        return jsonify({"error": "Dataset not found"}), 404

    df = pd.read_csv(DATASET_PATH)

    total_accidents = len(df)

    severity_counts = df["accident_severity"].value_counts().to_dict()
    weather_counts = df["weather"].value_counts().to_dict()
    traffic_counts = df["traffic_density"].value_counts().to_dict()

    return jsonify({
        "total_accidents": total_accidents,
        "severity": severity_counts,
        "weather": weather_counts,
        "traffic": traffic_counts
    })

# ===============================
# HOTSPOTS
# ===============================
@app.route("/hotspots")
def hotspots_page():
    if "user" not in session:
        return redirect("/login")
    return render_template("hotspots.html", user=session["user"])

@app.route("/api/hotspots")
def get_hotspots():
    if "user" not in session:
        return jsonify([])
    return jsonify(HOTSPOTS)

# ===============================
# PREDICT API
# ===============================
# ===============================
# PREDICT API (REAL-TIME CONTEXT)
# ===============================
@app.route("/predict", methods=["POST"])
def predict():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.get_json()

        lat = float(data["latitude"])
        lon = float(data["longitude"])

        # Get current time features automatically
        now = datetime.now()
        hour = now.hour
        day = now.day
        month = now.month
        day_of_week = now.weekday()

        # 🔥 REAL-TIME CONTEXT (No more defaults)
        live_weather = get_live_weather(lat, lon)
        live_traffic = estimate_traffic_density(hour)
        live_road = get_road_type(lat, lon)

        print("Live Context:", live_weather, live_traffic, live_road)

        features = pd.DataFrame([{
            "latitude": lat,
            "longitude": lon,
            "hour": hour,
            "day": day,
            "month": month,
            "day_of_week": day_of_week,
            "weather": safe_encode(weather_encoder, live_weather, "Clear"),
            "traffic_density": safe_encode(traffic_encoder, live_traffic, "Medium"),
            "road_type": safe_encode(road_encoder, live_road, "Urban")
        }])


        pred = int(model.predict(features)[0])
        probs = model.predict_proba(features)[0]
        severity = severity_map[pred]

        # Trigger emergency alert for high risk
        if severity in ["Serious", "Fatal"]:
            trigger_n8n_alert(lat, lon)

        return jsonify({
            "severity": severity,
            "confidence": round(float(probs[pred]), 3),
            "weather": live_weather,
            "traffic_density": live_traffic,
            "road_type": live_road
        })

    except Exception as e:
        print("Prediction Error:", e)
        return jsonify({"error": "Prediction failed. Check encoders & inputs."}), 500

# ===============================
# PREDICT BY PLACE NAME (NEW FEATURE)
# ===============================
@app.route("/predict-place", methods=["POST"])
def predict_place():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.get_json()
        place = data.get("place")

        if not place:
            return jsonify({"error": "Place name is required"}), 400

        # 🔍 Convert place → coordinates
        lat, lon = get_coordinates_from_place(place)

        if lat is None or lon is None:
            return jsonify({"error": "Place not found"}), 404

        # Time features (same as your model)
        now = datetime.now()
        hour = now.hour
        day = now.day
        month = now.month
        day_of_week = now.weekday()

        # Live contextual features (already in your code)
        live_weather = get_live_weather(lat, lon)
        live_traffic = estimate_traffic_density(hour)
        live_road = get_road_type(lat, lon)

        print("Place:", place)
        print("Coordinates:", lat, lon)
        print("Live Context:", live_weather, live_traffic, live_road)

        features = pd.DataFrame([{
            "latitude": lat,
            "longitude": lon,
            "hour": hour,
            "day": day,
            "month": month,
            "day_of_week": day_of_week,
            "weather": safe_encode(weather_encoder, live_weather, "Clear"),
            "traffic_density": safe_encode(traffic_encoder, live_traffic, "Medium"),
            "road_type": safe_encode(road_encoder, live_road, "Urban")
        }])

        pred = int(model.predict(features)[0])
        probs = model.predict_proba(features)[0]
        severity = severity_map[pred]

        # Trigger alert if high risk
        if severity in ["Serious", "Fatal"]:
            trigger_n8n_alert(lat, lon)

        return jsonify({
            "place": place,
            "latitude": lat,
            "longitude": lon,
            "severity": severity,
            "confidence": round(float(probs[pred]), 3),
            "weather": live_weather,
            "traffic_density": live_traffic,
            "road_type": live_road
        })

    except Exception as e:
        print("Place Prediction Error:", e)
        return jsonify({"error": "Prediction failed for selected place"}), 500

# ===============================
# MOBILE API ROUTES (JSON)
# ===============================
@app.route("/api/mobile/signup", methods=["POST"])
def mobile_signup():
    try:
        data = request.get_json()
        conn = sqlite3.connect("users.db")
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
            (
                data.get("name"),
                data.get("email"),
                data.get("phone"),
                data.get("password"),
                data.get("role", "user") # Default to user role
            )
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "User registered successfully."})
    except Exception as e:
        print("Mobile Signup Error:", e)
        return jsonify({"success": False, "error": "Email already exists or invalid data."}), 400

@app.route("/api/mobile/login", methods=["POST"])
def mobile_login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        conn = sqlite3.connect("users.db")
        cur = conn.cursor()
        cur.execute(
            "SELECT name, role, phone FROM users WHERE email=? AND password=?",
            (email, password)
        )
        user = cur.fetchone()
        conn.close()

        if user:
            return jsonify({
                "success": True,
                "user": {
                    "name": user[0],
                    "role": user[1],
                    "phone": user[2],
                    "email": email
                }
            })
        return jsonify({"success": False, "error": "Invalid email or password."}), 401
    except Exception as e:
        print("Mobile Login Error:", e)
        return jsonify({"success": False, "error": "An error occurred during login."}), 500

@app.route("/api/mobile/predict", methods=["POST"])
def mobile_predict():
    try:
        data = request.get_json()
        
        # We don't rely on Flask session here. We expect standard JSON bodies.
        lat = float(data.get("latitude"))
        lon = float(data.get("longitude"))
        # Optional user context for n8n alert
        user_email = data.get("email", "unknown@mobile.app")
        user_phone = data.get("phone", "Unknown")

        now = datetime.now()
        hour = now.hour
        day = now.day
        month = now.month
        day_of_week = now.weekday()

        live_weather = get_live_weather(lat, lon)
        live_traffic = estimate_traffic_density(hour)
        live_road = get_road_type(lat, lon)

        features = pd.DataFrame([{
            "latitude": lat,
            "longitude": lon,
            "hour": hour,
            "day": day,
            "month": month,
            "day_of_week": day_of_week,
            "weather": safe_encode(weather_encoder, live_weather, "Clear"),
            "traffic_density": safe_encode(traffic_encoder, live_traffic, "Medium"),
            "road_type": safe_encode(road_encoder, live_road, "Urban")
        }])

        pred = int(model.predict(features)[0])
        probs = model.predict_proba(features)[0]
        severity = severity_map[pred]

        if severity in ["Serious", "Fatal"]:
            # Custom alerting with mobile user context
            payload = {
                "danger": True,
                "latitude": lat,
                "longitude": lon,
                "user_email": user_email,
                "phone": user_phone,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            try:
                requests.post(N8N_WEBHOOK_URL, json=payload, timeout=5)
            except Exception as e:
                print("⚠️ n8n error (mobile predict):", e)

        return jsonify({
            "success": True,
            "severity": severity,
            "confidence": round(float(probs[pred]), 3),
            "weather": live_weather,
            "traffic_density": live_traffic,
            "road_type": live_road
        })

    except Exception as e:
        print("Mobile Prediction Error:", e)
        return jsonify({"success": False, "error": "Prediction failed. Check inputs."}), 500

@app.route("/api/mobile/predict-place", methods=["POST"])
def mobile_predict_place():
    try:
        data = request.get_json()
        place = data.get("place")
        user_email = data.get("email", "unknown@mobile.app")
        user_phone = data.get("phone", "Unknown")

        if not place:
            return jsonify({"success": False, "error": "Place name is required"}), 400

        lat, lon = get_coordinates_from_place(place)

        if lat is None or lon is None:
            return jsonify({"success": False, "error": "Place not found"}), 404

        now = datetime.now()
        hour = now.hour
        day = now.day
        month = now.month
        day_of_week = now.weekday()

        live_weather = get_live_weather(lat, lon)
        live_traffic = estimate_traffic_density(hour)
        live_road = get_road_type(lat, lon)

        features = pd.DataFrame([{
            "latitude": lat,
            "longitude": lon,
            "hour": hour,
            "day": day,
            "month": month,
            "day_of_week": day_of_week,
            "weather": safe_encode(weather_encoder, live_weather, "Clear"),
            "traffic_density": safe_encode(traffic_encoder, live_traffic, "Medium"),
            "road_type": safe_encode(road_encoder, live_road, "Urban")
        }])

        pred = int(model.predict(features)[0])
        probs = model.predict_proba(features)[0]
        severity = severity_map[pred]

        if severity in ["Serious", "Fatal"]:
            payload = {
                "danger": True,
                "latitude": lat,
                "longitude": lon,
                "user_email": user_email,
                "phone": user_phone,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            try:
                requests.post(N8N_WEBHOOK_URL, json=payload, timeout=5)
            except Exception as e:
                print("⚠️ n8n error (mobile predict-place):", e)

        return jsonify({
            "success": True,
            "place": place,
            "latitude": lat,
            "longitude": lon,
            "severity": severity,
            "confidence": round(float(probs[pred]), 3),
            "weather": live_weather,
            "traffic_density": live_traffic,
            "road_type": live_road
        })

    except Exception as e:
        print("Mobile Place Prediction Error:", e)
        return jsonify({"success": False, "error": "Prediction failed for selected place"}), 500

# ===============================
# MOBILE API ROUTES (JSON) - HOTSPOTS & ANALYTICS
# ===============================
@app.route("/api/mobile/hotspots", methods=["GET"])
def mobile_hotspots():
    return jsonify({"success": True, "hotspots": HOTSPOTS})

@app.route("/api/mobile/n8n-alert", methods=["POST"])
def mobile_n8n_alert():
    try:
        data = request.get_json()
        lat = float(data.get("latitude"))
        lon = float(data.get("longitude"))
        user_email = data.get("email", "unknown@mobile.app")
        user_phone = data.get("phone", "Unknown")

        payload = {
            "danger": True,
            "latitude": lat,
            "longitude": lon,
            "user_email": user_email,
            "phone": user_phone,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "source": "mobile_background_tracking"
        }
        
        try:
            requests.post(N8N_WEBHOOK_URL, json=payload, timeout=5)
            print(f"✅ Triggered n8n alert for {user_email} at {lat}, {lon}")
        except Exception as e:
            print("⚠️ n8n error (mobile background):", e)
            return jsonify({"success": False, "error": "n8n webhook timeout"}), 500

        return jsonify({"success": True, "message": "Alert triggered via n8n"})
    except Exception as e:
        print("Mobile n8n Alert Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/mobile/admin/add-accident", methods=["POST"])
def mobile_add_accident():
    try:
        data = request.get_json()
        new_row = {
            "latitude": float(data["latitude"]),
            "longitude": float(data["longitude"]),
            "date_time": datetime.now().strftime("%d-%m-%Y %H:%M"),
            "weather": "Unknown",
            "traffic_density": "Medium",
            "road_type": "Urban",
            "accident_severity": data["accident_severity"]
        }

        if os.path.exists(DATASET_PATH):
            df = pd.read_csv(DATASET_PATH)
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        else:
            df = pd.DataFrame([new_row])

        df.to_csv(DATASET_PATH, index=False)
        return jsonify({"success": True, "message": "Accident added successfully"})
    except Exception as e:
        print("Mobile Add Accident Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/mobile/admin/recompute-hotspots", methods=["POST"])
def mobile_recompute_hotspots():
    try:
        subprocess.run(["python", HOTSPOT_SCRIPT], check=True)
        global HOTSPOTS
        HOTSPOTS = load_hotspots()
        return jsonify({"success": True, "message": "Hotspots recomputed successfully"})
    except Exception as e:
        print("Mobile Recompute Error:", e)
        return jsonify({"success": False, "error": "Failed to recompute hotspots"}), 500

@app.route("/api/mobile/admin/analytics", methods=["GET"])
def mobile_analytics():
    try:
        if not os.path.exists(DATASET_PATH):
            return jsonify({"success": False, "error": "Dataset not found"}), 404

        df = pd.read_csv(DATASET_PATH)
        total_accidents = len(df)
        severity_counts = df["accident_severity"].value_counts().to_dict()
        weather_counts = df["weather"].value_counts().to_dict()
        traffic_counts = df["traffic_density"].value_counts().to_dict()

        return jsonify({
            "success": True,
            "total_accidents": total_accidents,
            "severity": severity_counts,
            "weather": weather_counts,
            "traffic": traffic_counts
        })
    except Exception as e:
        print("Mobile Analytics Error:", e)
        return jsonify({"success": False, "error": str(e)}), 500

# ===============================
# RUN
# ===============================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

