import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import API from "../api/client";

export default function TicketDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("wsit_user") || "null");

  const [ticket, setTicket]     = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState("");
  const chatEndRef = useRef(null);

  const fetchTicket = useCallback(async () => {
    try { const { data } = await API.get(`/tickets/${id}`); setTicket(data); }
    catch { setError("Ticket not found or access denied."); }
  }, [id]);

  const fetchMessages = useCallback(async () => {
    try { const { data } = await API.get(`/tickets/${id}/messages`); setMessages(data); }
    catch { }
  }, [id]);

  useEffect(() => { fetchTicket(); fetchMessages(); }, [fetchTicket, fetchMessages]);

  // Poll messages every 5 seconds
  useEffect(() => {
    const id_interval = setInterval(() => fetchMessages(), 5000);
    return () => clearInterval(id_interval);
  }, [fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e) {
    e.preventDefault();
    const content = msgInput.trim();
    if (!content) return;
    setSending(true);
    try {
      await API.post(`/tickets/${id}/messages`, { content });
      setMsgInput("");
      fetchMessages();
    } catch { } finally { setSending(false); }
  }

  if (error) return (
    <>
      <Navbar title="Ticket Details" />
      <div className="container">
        <div className="card" style={{ marginTop: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</p>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Go Back</button>
        </div>
      </div>
    </>
  );

  if (!ticket) return (
    <>
      <Navbar title="Ticket Details" />
      <div className="container" style={{ paddingTop: "2rem" }}>
        <div className="empty-state"><p>Loading ticket…</p></div>
      </div>
    </>
  );

  const isOwner    = user?.role === "customer" && ticket.customer_id === user?.id;
  const isTech     = user?.role === "technician";
  const isAdmin    = user?.role === "admin";
  const canMessage = isOwner || isTech || isAdmin;

  const statusColors = { open: "#2563eb", in_progress: "#d97706", resolved: "#16a34a", closed: "#64748b" };
  const statusColor  = statusColors[ticket.status] || "#64748b";

  return (
    <>
      <Navbar title="Ticket Details" />
      <div className="container" style={{ paddingBottom: "2rem" }}>
        <div style={{ margin: "1.25rem 0 0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Back</button>
          <span style={{ fontSize: "0.78rem", color: "var(--gray-400)" }}>Ticket #{ticket.id}</span>
        </div>

        {/* Header card */}
        <div className="card" style={{ borderLeft: `4px solid ${statusColor}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--navy)", marginBottom: "0.3rem" }}>{ticket.title}</h2>
              <span style={{ fontSize: "0.82rem", color: "var(--gray-600)" }}>{ticket.service_type} · {ticket.location}</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <StatusBadge value={ticket.priority} />
              <StatusBadge value={ticket.status} />
            </div>
          </div>

          <hr className="divider" />

          <div className="meta-grid">
            <div className="meta-item"><label>Submitted By</label><span>{ticket.customer_name || "—"}</span></div>
            <div className="meta-item"><label>Assigned Technician</label><span>{ticket.assigned_technician || "Not yet assigned"}</span></div>
            <div className="meta-item"><label>Created</label><span>{ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "—"}</span></div>
            <div className="meta-item"><label>Last Updated</label><span>{ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : "—"}</span></div>
          </div>

          <hr className="divider" />

          <div>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--gray-400)", marginBottom: "0.4rem" }}>Description</p>
            <p style={{ lineHeight: 1.7, color: "var(--gray-800)", fontSize: "0.9rem" }}>{ticket.description}</p>
          </div>

          {/* Technician notes — visible to technician and admin */}
          {(isTech || isAdmin) && ticket.technician_notes && (
            <>
              <hr className="divider" />
              <div className="notes-box">
                <h4>Technical Notes</h4>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#78350f" }}>{ticket.technician_notes}</p>
              </div>
            </>
          )}
        </div>

        {/* Chat section */}
        {canMessage && (
          <div className="card">
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--navy)", marginBottom: "1rem" }}>
              Conversation
              <span style={{ fontWeight: 400, fontSize: "0.75rem", color: "var(--gray-400)", marginLeft: "0.5rem" }}>Updates every 5 seconds</span>
            </h3>

            <div className="chat-container">
              {messages.length === 0 && (
                <p style={{ textAlign: "center", color: "var(--gray-400)", fontSize: "0.83rem", padding: "1.5rem 0" }}>
                  No messages yet. Start the conversation below.
                </p>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`msg-bubble ${isMe ? "me" : `them ${msg.sender_role}`}`}>
                    <div className="msg-meta">
                      {!isMe && <strong>{msg.sender_name}</strong>}
                      {!isMe && <span style={{ marginLeft: "0.3rem" }}>({msg.sender_role})</span>}
                      {isMe && <span>You</span>}
                      <span style={{ marginLeft: "0.4rem" }}>{msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                    </div>
                    <div className="msg-content">{msg.content}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {ticket.status !== "closed" ? (
              <form onSubmit={sendMessage} className="chat-input-row">
                <input
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  placeholder="Type a message…"
                  disabled={sending}
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !msgInput.trim()}>
                  {sending ? "…" : "Send"}
                </button>
              </form>
            ) : (
              <div className="alert alert-info" style={{ fontSize: "0.82rem" }}>This ticket is closed. No further messages can be sent.</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
