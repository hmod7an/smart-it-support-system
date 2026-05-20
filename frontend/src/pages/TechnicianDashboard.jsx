import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import API from "../api/client";

const STATUS_OPTIONS   = ["in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [feedback, setFeedback]       = useState({});
  const [notesInput, setNotesInput]   = useState({});
  const [filterStatus, setFilterStatus]     = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const user = JSON.parse(localStorage.getItem("wsit_user") || "null");

  const fetchAssigned = useCallback(async (params = {}) => {
    setLoading(true);
    try { const { data } = await API.get("/tickets/assigned", { params }); setTickets(data); }
    catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssigned(); }, [fetchAssigned]);

  useEffect(() => {
    const id = setInterval(() => fetchAssigned({ status: filterStatus || undefined, priority: filterPriority || undefined }), 10000);
    return () => clearInterval(id);
  }, [fetchAssigned, filterStatus, filterPriority]);

  function handleFilter() { fetchAssigned({ status: filterStatus || undefined, priority: filterPriority || undefined }); }
  function handleClear() { setFilterStatus(""); setFilterPriority(""); fetchAssigned(); }

  async function handleStatusUpdate(ticketId, newStatus) {
    try {
      await API.put(`/tickets/${ticketId}/resolve`, { status: newStatus });
      setFeedback({ ...feedback, [ticketId]: `Marked as ${newStatus}` });
      fetchAssigned();
    } catch (err) {
      setFeedback({ ...feedback, [ticketId]: err.response?.data?.detail || "Update failed" });
    }
  }

  async function handleSaveNotes(ticketId) {
    const notes = notesInput[ticketId];
    if (notes === undefined) return;
    try {
      await API.put(`/tickets/${ticketId}/notes`, { technician_notes: notes });
      setFeedback({ ...feedback, [ticketId]: "Notes saved!" });
      fetchAssigned();
    } catch {
      setFeedback({ ...feedback, [ticketId]: "Failed to save notes" });
    }
  }

  const counts = tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  return (
    <>
      <Navbar title="Technician Dashboard" />
      <div className="container">

        <div className="welcome-banner" style={{ marginTop: "1.5rem" }}>
          <h3>Welcome, {user?.full_name}</h3>
          <p>Your assigned tickets are shown below. Update their status and add technical notes as you work.</p>
        </div>

        <div className="stats-grid">
          {[
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

        <div className="filter-bar">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleFilter}>Apply</button>
          <button className="btn btn-ghost btn-sm" onClick={handleClear}>Clear</button>
          <button className="btn btn-ghost btn-sm" onClick={() => fetchAssigned()} style={{ marginLeft: "auto" }}>Refresh</button>
        </div>

        <div className="dash-header">
          <h2>My Assigned Tickets {tickets.length > 0 && `(${tickets.length})`}</h2>
        </div>

        {loading ? (
          <div className="card"><div className="empty-state"><p>Loading your tickets…</p></div></div>
        ) : tickets.length === 0 ? (
          <div className="card"><div className="empty-state"><div className="empty-icon">📭</div><p>No tickets assigned to you yet.</p></div></div>
        ) : tickets.map((t) => (
          <div className="card" key={t.id} style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--gray-400)", fontWeight: 700 }}>TICKET #{t.id}</span>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)", marginTop: "0.15rem" }}>{t.title}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--gray-600)" }}>{t.service_type} · {t.location}</span>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <StatusBadge value={t.priority} />
                <StatusBadge value={t.status} />
              </div>
            </div>

            <hr className="divider" />

            <div className="meta-grid" style={{ marginBottom: "0.75rem" }}>
              <div className="meta-item"><label>Customer</label><span>{t.customer_name || "—"}</span></div>
              <div className="meta-item"><label>Submitted</label><span>{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</span></div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "0.75rem" }}>
              {t.status === "in_progress" && (
                <button className="btn btn-success btn-sm" onClick={() => handleStatusUpdate(t.id, "resolved")}>Mark Resolved</button>
              )}
              {t.status === "resolved" && (
                <button className="btn btn-sm" style={{ background: "var(--gray-600)", color: "#fff" }} onClick={() => handleStatusUpdate(t.id, "closed")}>Mark Closed</button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tickets/${t.id}`)}>View & Chat</button>
              {feedback[t.id] && <span style={{ fontSize: "0.78rem", color: "var(--success)", fontWeight: 600 }}>{feedback[t.id]}</span>}
            </div>

            {/* Technician Notes */}
            <div className="notes-box">
              <h4>Internal Notes (only you and admin can see this)</h4>
              <textarea
                rows={3}
                style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1.5px solid #fde68a", borderRadius: "7px", fontSize: "0.85rem", outline: "none", background: "#fffdf0", resize: "vertical" }}
                placeholder="Add technical notes, findings, parts needed…"
                value={notesInput[t.id] !== undefined ? notesInput[t.id] : (t.technician_notes || "")}
                onChange={(e) => setNotesInput({ ...notesInput, [t.id]: e.target.value })}
              />
              <button className="btn btn-sm btn-warning" style={{ marginTop: "0.4rem" }} onClick={() => handleSaveNotes(t.id)}>
                Save Notes
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
