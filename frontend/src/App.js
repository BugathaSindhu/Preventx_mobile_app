import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import LiveMap from "./pages/LiveMap";
import Analytics from "./pages/Analytics";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AdminDashboard from "./pages/AdminDashboard";
import AddAccident from "./pages/AddAccident";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<LiveMap />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/add-accident" element={<AddAccident />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
