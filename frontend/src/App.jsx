import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import TechnicianDashboard from "./pages/TechnicianDashboard";
import TicketDetails from "./pages/TicketDetails";

function getHomePath(role) {
  if (role === "admin") return "/admin";
  if (role === "technician") return "/technician";
  return "/dashboard";
}

function RequireAuth({ children, requiredRole }) {
  const user = JSON.parse(localStorage.getItem("wsit_user") || "null");
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth requiredRole="customer">
              <CustomerDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth requiredRole="admin">
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/technician"
          element={
            <RequireAuth requiredRole="technician">
              <TechnicianDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <RequireAuth>
              <TicketDetails />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
