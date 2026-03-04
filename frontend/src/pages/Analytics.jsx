import React, { useEffect, useState } from "react";
import API from "../api/api";
import { Pie, Bar } from "react-chartjs-2";

const Analytics = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    API.get("/admin/analytics-data").then((res) => setData(res.data));
  }, []);

  if (!data) return <h2>Loading analytics...</h2>;

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Accident Analytics Dashboard</h2>
      <h3>Total Accidents: {data.total_accidents}</h3>

      <Pie
        data={{
          labels: Object.keys(data.severity),
          datasets: [{ data: Object.values(data.severity) }],
        }}
      />

      <Bar
        data={{
          labels: Object.keys(data.weather),
          datasets: [
            { label: "Weather vs Accidents", data: Object.values(data.weather) },
          ],
        }}
      />
    </div>
  );
};

export default Analytics;
