import React from "react";
import { useNavigate } from "react-router-dom";

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("wsit_user") || "null");

  function handleLogout() {
    localStorage.removeItem("wsit_token");
    localStorage.removeItem("wsit_user");
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="navbar-brand-icon">W</div>
        <h1>WSiT · {title}</h1>
      </div>
      <div className="navbar-right">
        {user && (
          <span className="navbar-user">
            {user.full_name} <span style={{ opacity: 0.6 }}>· {user.role}</span>
          </span>
        )}
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
