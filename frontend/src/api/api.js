import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:5000", // 🔥 MUST match Flask
  withCredentials: true,            // 🔥 REQUIRED for session cookies
});

export default API;
