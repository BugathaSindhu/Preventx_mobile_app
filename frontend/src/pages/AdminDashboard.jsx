import React from "react";

const AdminDashboard = () => {
  return (
    <div style={{ padding: 30 }}>
      <h2>🛠️ Admin Dashboard</h2>

      <button onClick={() => window.location.href="/add-accident"}>
        ➕ Add New Accident
      </button><br/><br/>

      <button onClick={() => window.location.href="/map"}>
        🗺️ View Hotspots Map
      </button><br/><br/>

      <button onClick={() => window.location.href="/analytics"}>
        📊 View Analytics Dashboard
      </button>
    </div>
  );
};

export default AdminDashboard;
