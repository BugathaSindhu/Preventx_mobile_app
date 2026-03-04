import React, { useState } from "react";
import API from "../api/api";

const AddAccident = () => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [severity, setSeverity] = useState("Minor");

  const submitAccident = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("latitude", lat);
    formData.append("longitude", lon);
    formData.append("accident_severity", severity);

    try {
      await API.post("/admin/add-accident", formData);
      alert("Accident Added Successfully!");
    } catch {
      alert("Error adding accident");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Add Accident Record</h2>
      <form onSubmit={submitAccident}>
        <input placeholder="Latitude" onChange={(e)=>setLat(e.target.value)} required /><br/><br/>
        <input placeholder="Longitude" onChange={(e)=>setLon(e.target.value)} required /><br/><br/>

        <select onChange={(e)=>setSeverity(e.target.value)}>
          <option value="Minor">Minor</option>
          <option value="Serious">Serious</option>
          <option value="Fatal">Fatal</option>
        </select><br/><br/>

        <button type="submit">Save Accident</button>
      </form>
    </div>
  );
};

export default AddAccident;
