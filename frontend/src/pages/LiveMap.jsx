import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle } from "react-leaflet";
import API from "../api/api";
import "leaflet/dist/leaflet.css";

const LiveMap = () => {
  const [position, setPosition] = useState([16.5, 80.6]);
  const [hotspots, setHotspots] = useState([]);
  const [risk, setRisk] = useState("Waiting for GPS...");

  useEffect(() => {
    API.get("/api/hotspots").then((res) => setHotspots(res.data));

    navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      setPosition([lat, lon]);

      API.post("/predict", {
        latitude: lat,
        longitude: lon,
      }).then((res) => {
        setRisk(res.data.severity);
      });
    });
  }, []);

  return (
    <div>
      <h2>🚗 Live Risk Map: {risk}</h2>

      <MapContainer center={position} zoom={13} style={{ height: "80vh" }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <Marker position={position} />

        {hotspots.map((h, i) => (
          <Circle
            key={i}
            center={[h.latitude, h.longitude]}
            radius={500}
            pathOptions={{ color: "red" }}
          />
        ))}
      </MapContainer>
    </div>
  );
};

export default LiveMap;
