import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import API from "../api/client";

const STATUS_OPTIONS   = ["open", "in_progress", "resolved", "closed"];
const PRIORITY_OPTIONS = ["low", "medium", "high", "critical"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets]           = useState([]);
  const [technicians, setTechnicians]   = useState([]);
  const [pending, setPending]           = useState([]);
  const [auditLogs, setAuditLogs]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [techInputs, setTechInputs]     = useState({});
  const [statusInputs, setStatusInputs] = useState({});
  const [feedback, setFeedback]         = useState({});
  const [activeTab, setActiveTab]       = useState("tickets");
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");

  const fetchAll = useCallback(async (params = {}) => {
    setLoading(true);
    try { const { data } = await API.get("/tickets", { params }); setTickets(data); }
    catch { } finally { setLoading(false); }
  }, []);

  const fetchSupport = useCallback(async () => {
    try {
      const [techRes, pendRes, auditRes] = await Promise.all([
        API.get("/technicians"),
        API.get("/technicians/pending"),
        API.get("/audit-logs"),
      ]);
      setTechnicians(techRes.data);
      setPending(pendRes.data);
      setAuditLogs(auditRes.data);
    } catch { }
  }, []);

  useEffect(() => { fetchAll(); fetchSupport(); }, [fetchAll, fetchSupport]);
  useEffect(() => {
    const id = setInterval(() => fetchSupport(), 10000);
    return () => clearInterval(id);
  }, [fetchSupport]);

  function handleFilter(e) {
    e.preventDefault();
    fetchAll({ search: search || undefined, status: filterStatus || undefined, priority: filterPriority || undefined });
  }
  function handleClear() { setSearch(""); setFilterStatus(""); setFilterPriority(""); fetchAll(); }

  async function handleAssign(ticketId) {
    const tech = techInputs[ticketId]?.trim();
    if (!tech) return;
    try {
      await API.put(`/tickets/${ticketId}/assign`, { assigned_technician: tech });
      setFeedback({ ...feedback, [ticketId]: "Assigned!" });
      fetchAll(); fetchSupport();
    } catch { setFeedback({ ...feedback, [ticketId]: "Error" }); }
  }

  async function handleStatusUpdate(ticketId) {
    const status = statusInputs[ticketId];
    if (!status) return;
    try {
      await API.put(`/tickets/${ticketId}/status`, { status });
      setFeedback({ ...feedback, [ticketId]: "Updated!" });
      fetchAll(); fetchSupport();
    } catch { setFeedback({ ...feedback, [ticketId]: "Error" }); }
  }

  async function handleApprove(userId) {
    try { await API.put(`/technicians/${userId}/approve`); fetchSupport(); fetchAll(); }
    catch { }
  }

  const counts = tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  return (
    <>
      <Navbar title="Admin Dashboard" />
      <div className="container">

        <div className="stats-grid" style={{ marginTop: "1.5rem" }}>
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

        {pending.length > 0 && (
          <div className="alert alert-warning" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>{pending.length} technician{pending.length > 1 ? "s" : ""} waiting for approval</span>
            <button className="btn btn-warning btn-sm" onClick={() => setActiveTab("pending")}>Review Now</button>
          </div>
        )}

        <div style={{ display: "flex", gap: "0", margin: "1.25rem 0 0", borderBottom: "2px solid var(--gray-200)" }}>
          {[
            { key: "tickets", label: `All Tickets (${tickets.length})` },
            { key: "pending", label: `Approvals${pending.length > 0 ? ` (${pending.length})` : ""}` },
            { key: "audit",   label: "Activity Log" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              padding: "0.55rem 1.1rem", border: "none", background: "transparent", cursor: "pointer",
              fontWeight: 600, fontSize: "0.83rem",
              color: activeTab === key ? "var(--primary)" : "var(--gray-600)",
              borderBottom: activeTab === key ? "2px solid var(--primary)" : "2px solid transparent",
              marginBottom: "-2px",
            }}>{label}</button>
          ))}
        </div>

        {activeTab === "tickets" && (
          <>
            <form onSubmit={handleFilter} className="filter-bar">
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, description, location…" style={{ flex: 2, minWidth: 160 }} />
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                <option value="">All Priorities</option>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" type="submit">Filter</button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleClear}>Clear</button>
            </form>

            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              {loading ? (
                <div className="empty-state"><p>Loading tickets…</p></div>
              ) : tickets.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">📋</div><p>No tickets match your filters.</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr>
                      <th>#</th><th>Customer</th><th>Title</th><th>Service</th>
                      <th>Priority</th><th>Status</th><th>Assigned</th>
                      <th>Assign Technician</th><th>Update Status</th><th></th>
                    </tr></thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id}>
                          <td style={{ color: "var(--gray-400)", fontWeight: 700 }}>#{t.id}</td>
                          <td style={{ fontWeight: 600 }}>{t.customer_name || "—"}</td>
                          <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</td>
                          <td><span style={{ fontSize: "0.78rem" }}>{t.service_type}</span></td>
                          <td><StatusBadge value={t.priority} /></td>
                          <td><StatusBadge value={t.status} /></td>
                          <td style={{ fontSize: "0.82rem" }}>{t.assigned_technician || <span style={{ color: "var(--gray-400)" }}>—</span>}</td>
                          <td>
                            <div className="inline-form">
                              {technicians.length === 0 ? (
                                <span style={{ fontSize: "0.75rem", color: "var(--gray-400)" }}>No technicians</span>
                              ) : (
                                <>
                                  <select value={techInputs[t.id] || ""} onChange={(e) => setTechInputs({ ...techInputs, [t.id]: e.target.value })}>
                                    <option value="">Select…</option>
                                    {technicians.map((tech) => <option key={tech.id} value={tech.full_name}>{tech.full_name}</option>)}
                                  </select>
                                  <button className="btn btn-success btn-sm" onClick={() => handleAssign(t.id)}>Assign</button>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="inline-form">
                              <select value={statusInputs[t.id] || t.status} onChange={(e) => setStatusInputs({ ...statusInputs, [t.id]: e.target.value })}>
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button className="btn btn-primary btn-sm" onClick={() => handleStatusUpdate(t.id)}>Save</button>
                            </div>
                            {feedback[t.id] && <span style={{ fontSize: "0.72rem", color: "var(--success)", display: "block", marginTop: "0.2rem" }}>{feedback[t.id]}</span>}
                          </td>
                          <td><button className="btn btn-ghost btn-sm" onClick={() => navigate(`/tickets/${t.id}`)}>View</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "pending" && (
          <div className="card" style={{ marginTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", color: "var(--navy)" }}>
              Pending Technician Approvals
            </h3>
            {pending.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">✅</div><p>All technicians are approved.</p></div>
            ) : pending.map((u) => (
              <div className="pending-card" key={u.id}>
                <div className="pending-info">
                  <span className="pending-name">{u.full_name}</span>
                  <span className="pending-email">{u.email}</span>
                </div>
                <button className="btn btn-success btn-sm" onClick={() => handleApprove(u.id)}>Approve</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "audit" && (
          <div className="card" style={{ marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--navy)" }}>Activity Log</h3>
              <span style={{ fontSize: "0.73rem", color: "var(--gray-400)" }}>Auto-refreshes every 10s</span>
            </div>
            {auditLogs.length === 0 ? (
              <div className="empty-state"><div className="empty-icon">📝</div><p>No activity recorded yet.</p></div>
            ) : auditLogs.map((log) => (
              <div className="audit-row" key={log.id}>
                <div className="audit-dot" />
                <div>
                  <div className="audit-action">
                    {log.action}
                    {log.ticket_id && (
                      <span style={{ color: "var(--primary)", marginLeft: "0.4rem", cursor: "pointer", fontSize: "0.8rem" }}
                        onClick={() => navigate(`/tickets/${log.ticket_id}`)}>
                        Ticket #{log.ticket_id}
                      </span>
                    )}
                  </div>
                  <div className="audit-meta">
                    By <strong style={{ color: "var(--gray-600)" }}>{log.actor_name}</strong>
                    {log.details && <> — {log.details}</>}
                    {" · "}{log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </>
  );
}
