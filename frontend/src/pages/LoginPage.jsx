import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/client";

function getHomePath(role) {
  if (role === "admin") return "/admin";
  if (role === "technician") return "/technician";
  return "/dashboard";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function handleLogin(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const { data } = await API.post("/auth/login", { email: form.email, password: form.password });
      localStorage.setItem("wsit_token", data.token);
      localStorage.setItem("wsit_user", JSON.stringify(data.user));
      navigate(getHomePath(data.user.role));
    } catch (err) { setError(err.response?.data?.detail || "Login failed"); }
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await API.post("/customers/register", form);
      setTab("login");
      setError(form.role === "technician"
        ? "Account created! Wait for admin approval before logging in."
        : "Registration successful! Please sign in.");
    } catch (err) { setError(err.response?.data?.detail || "Registration failed"); }
    finally { setLoading(false); }
  }

  const isSuccess = error && (error.includes("successful") || error.includes("approval") || error.includes("created"));

  return (
    <div className="login-wrapper">
      <div className="login-box">
        <div className="login-logo">
          <div className="login-logo-icon">W</div>
          <h2>WSiT Support Portal</h2>
          <p className="subtitle">Smart IT Service Request System</p>
        </div>

        <div className="tab-switcher">
          {["login", "register"].map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`}
              onClick={() => { setTab(t); setError(""); }}>
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Enter your password" />
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.7rem" }} disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
            <p style={{ fontSize: "0.73rem", color: "var(--gray-400)", textAlign: "center", marginTop: "0.75rem" }}>
              Default admin: admin@wsit.com / admin123
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>Full Name</label>
              <input name="full_name" value={form.full_name} onChange={handleChange} required placeholder="Jane Doe" />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Choose a strong password" />
            </div>
            <div className="form-group">
              <label>Account Type</label>
              <div className="role-toggle">
                {[{ value: "customer", label: "Customer", desc: "Submit service requests" },
                  { value: "technician", label: "Technician", desc: "Handle assigned tickets" }].map(({ value, label, desc }) => (
                  <button key={value} type="button"
                    className={`role-btn ${form.role === value ? "active" : ""}`}
                    onClick={() => setForm({ ...form, role: value })}>
                    <div>{label}</div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 400, opacity: 0.75, marginTop: "2px" }}>{desc}</div>
                  </button>
                ))}
              </div>
              {form.role === "technician" && (
                <div className="alert alert-warning" style={{ marginTop: "0.5rem" }}>
                  Technician accounts require admin approval before login.
                </div>
              )}
            </div>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "0.7rem" }} disabled={loading}>
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>
        )}

        {error && <div className={`error-msg ${isSuccess ? "success" : "error"}`}>{error}</div>}
      </div>
    </div>
  );
}
