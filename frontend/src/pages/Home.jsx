import React, { useState } from "react";
import API from "../api/api";

const Home = () => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [place, setPlace] = useState("");
  const [result, setResult] = useState("");

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
      },
      () => alert("Location permission denied")
    );
  };

  const predictRisk = async () => {
    if (!lat || !lon) {
      setResult("Please get location first");
      return;
    }

    try {
      const res = await API.post("/predict", {
        latitude: lat,
        longitude: lon,
      });

      const data = res.data;
      setResult(
        `Risk: ${data.severity} | Confidence: ${data.confidence}
Weather: ${data.weather} | Traffic: ${data.traffic_density}`
      );
    } catch (err) {
      setResult("Prediction failed");
    }
  };

  const predictPlace = async () => {
    if (!place) return setResult("Enter a place");

    try {
      const res = await API.post("/predict-place", { place });
      const data = res.data;

      setLat(data.latitude);
      setLon(data.longitude);

      setResult(
        `Place: ${data.place}
Risk: ${data.severity}
Confidence: ${data.confidence}`
      );
    } catch {
      setResult("Place prediction failed");
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>🚦 Traffic Accident Risk Prediction</h2>

      <button onClick={getLocation}>📍 Get Current Location</button>

      <div>
        <input
          placeholder="Latitude"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
        />
        <input
          placeholder="Longitude"
          value={lon}
          onChange={(e) => setLon(e.target.value)}
        />
      </div>

      <button onClick={predictRisk}>🔍 Predict Risk</button>

      <hr />

      <input
        placeholder="Enter Place (e.g. Vizag)"
        value={place}
        onChange={(e) => setPlace(e.target.value)}
      />
      <button onClick={predictPlace}>📍 Predict by Place</button>

      <h3>{result}</h3>
    </div>
  );
};

export default Home;
