import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import API from "../api/client";

const SERVICE_TYPES  = ["CCTV", "Networking", "Maintenance", "Smart Home", "Access Control", "Tech Support"];
const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("wsit_user") || "null");

  const [tickets, setTickets]           = useState([]);
  const [listLoading, setListLoading]   = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [submitMsg, setSubmitMsg]       = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const [form, setForm] = useState({
    service_type: "", title: "", description: "", location: "", priority: "medium",
  });

  const fetchMyTickets = useCallback(async (params = {}) => {
    setListLoading(true);
    try { const { data } = await API.get("/tickets/my", { params }); setTickets(data); }
    catch { } finally { setListLoading(false); }
  }, []);

  useEffect(() => { fetchMyTickets(); }, [fetchMyTickets]);

  useEffect(() => {
    const id = setInterval(() => fetchMyTickets({ status: filterStatus || undefined, priority: filterPriority || undefined }), 10000);
    return () => clearInterval(id);
  }, [fetchMyTickets, filterStatus, filterPriority]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.service_type) { setSubmitMsg("Please select a service type."); return; }
    setSubmitting(true); setSubmitMsg("");
    try {
      await API.post("/tickets", form);
      setSubmitMsg("Request submitted successfully!");
      setForm({ service_type: "", title: "", description: "", location: "", priority: "medium" });
      setShowForm(false);
      fetchMyTickets();
    } catch (err) { setSubmitMsg(err.response?.data?.detail || "Submission failed"); }
    finally { setSubmitting(false); }
  }

  const counts = tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  return (
    <>
      <Navbar title="Customer Dashboard" />
      <div className="container">

        <div className="welcome-banner" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h3>Welcome back, {user?.full_name}</h3>
              <p>Track your service requests and communicate with our technicians.</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setSubmitMsg(""); }}>
              {showForm ? "✕ Cancel" : "+ New Request"}
            </button>
          </div>
        </div>

        <div className="stats-grid">
          {[
            { label: "Open",        key: "open",        c: "#2563eb" },
            { label: "In Progress", key: "in_progress", c: "#d97706" },
            { label: "Resolved",    key: "resolved",    c: "#16a34a" },
            { label: "Closed",      key: "closed",      c: "#64748b" },
          ].map(({ label, key, c }) => (
            <div className="stat-card" key={key} style={{ "--c": c }}>
              <div className="stat-number">{counts[key] || 0}</div>
              <div className="stat-label">{label}</div>
            </div>
          ))}
        </div>

        {/* Submit form */}
        {showForm && (
          <div className="card">
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)", marginBottom: "1rem" }}>New Service Request</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1rem" }}>
                <div className="form-group">
                  <label>Service Type</label>
                  <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} required>
                    <option value="">Select service…</option>
                    {SERVICE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                    {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Brief description of the issue" />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required placeholder="Building, floor, room number…" />
              </div>
              <div className="form-group">
                <label>Full Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Describe the problem in detail…" rows={4} />
              </div>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Request"}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
                {submitMsg && <span style={{ fontSize: "0.83rem", color: submitMsg.includes("success") ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>{submitMsg}</span>}
              </div>
            </form>
          </div>
        )}

        {submitMsg && !showForm && (
          <div className={`alert ${submitMsg.includes("success") ? "alert-success" : "alert-info"}`}>{submitMsg}</div>
        )}

        <div className="filter-bar">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => fetchMyTickets({ status: filterStatus || undefined, priority: filterPriority || undefined })}>Filter</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterStatus(""); setFilterPriority(""); fetchMyTickets(); }}>Clear</button>
          <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--gray-400)" }}>Auto-refreshes every 10s</span>
        </div>

        <div className="dash-header">
          <h2>My Service Requests {tickets.length > 0 && `(${tickets.length})`}</h2>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {listLoading ? (
            <div className="empty-state"><p>Loading your tickets…</p></div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No requests yet. Click "+ New Request" to get started.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr>
                  <th>#</th><th>Title</th><th>Service</th><th>Priority</th>
                  <th>Status</th><th>Assigned To</th><th>Submitted</th><th></th>
                </tr></thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td style={{ color: "var(--gray-400)", fontWeight: 700 }}>#{t.id}</td>
                      <td style={{ fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</td>
                      <td><span style={{ fontSize: "0.78rem" }}>{t.service_type}</span></td>
                      <td><StatusBadge value={t.priority} /></td>
                      <td><StatusBadge value={t.status} /></td>
                      <td style={{ fontSize: "0.82rem" }}>{t.assigned_technician || <span style={{ color: "var(--gray-400)" }}>Pending</span>}</td>
                      <td style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tickets/${t.id}`)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
