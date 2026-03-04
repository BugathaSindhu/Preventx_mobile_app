import React, { useState } from "react";
import API from "../api/api";

const Signup = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "user",
  });

  const signup = async (e) => {
    e.preventDefault();
    const formData = new FormData();

    Object.keys(form).forEach((key) =>
      formData.append(key, form[key])
    );

    try {
      await API.post("/signup", formData);
      window.location.href = "/login";
    } catch {
      alert("Signup failed");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>Signup</h2>
      <form onSubmit={signup}>
        <input placeholder="Name" onChange={(e)=>setForm({...form,name:e.target.value})} /><br/><br/>
        <input placeholder="Email" onChange={(e)=>setForm({...form,email:e.target.value})} /><br/><br/>
        <input placeholder="Phone (+91...)" onChange={(e)=>setForm({...form,phone:e.target.value})} /><br/><br/>
        <input type="password" placeholder="Password" onChange={(e)=>setForm({...form,password:e.target.value})} /><br/><br/>
        <select onChange={(e)=>setForm({...form,role:e.target.value})}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select><br/><br/>
        <button type="submit">Create Account</button>
      </form>
    </div>
  );
};

export default Signup;
