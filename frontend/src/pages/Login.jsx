import React, { useState } from "react";
import API from "../api/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const login = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      await API.post("/login", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      window.location.href = "/";
    } catch {
      alert("Invalid login");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Login</h2>
      <form onSubmit={login}>
        <input
          type="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        /><br/><br/>
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br/><br/>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
