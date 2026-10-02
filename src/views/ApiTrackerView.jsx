import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Activity, CheckCircle2, XCircle, Send, MessageSquare, BarChart3, AlertCircle, Terminal, Copy, X, Download, FileJson } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from "recharts";

export function ApiTrackerView() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  // New Filters & States
  const [filterSender, setFilterSender] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State for detailed log
  const [selectedLog, setSelectedLog] = useState(null);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSender, filterStatus, dateFilter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alliance/external/apitracker");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch tracker data", err);
    }
    setLoading(false);
  };

  const exportToCSV = () => {
    if (!filteredLogs.length) return alert("No logs to export");
    const headers = ["Timestamp", "Sender", "Project", "Destination", "Type", "Template", "Status", "Error Message"];
    const rows = filteredLogs.map(log => {
      return [
        new Date(log.created_at).toISOString(),
        `"${log.sender_name || ""}"`,
        `"${log.project_name || ""}"`,
        `"${log.phone_number || ""}"`,
        `"${log.message_type || ""}"`,
        `"${log.template_name || ""}"`,
        `"${log.status || ""}"`,
        `"${log.error_message ? log.error_message.replace(/"/g, '""') : ""}"`
      ];
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `api_logs_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !data) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#040812", color: "#f8fafc" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Activity size={24} color="#f8fafc" style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }} />
          <div style={{ fontSize: "14px", fontWeight: "500", color: "#94a3b8" }}>Loading API telemetry...</div>
          <style>{"@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }"}</style>
        </div>
      </div>
    );
  }

  const filteredLogs = data.recent_logs?.filter(log => {
    if (filterSender !== "All" && log.sender_name !== filterSender) return false;
    if (filterStatus !== "All" && log.status !== filterStatus) return false;
    
    // Date Filtering
    if (dateFilter !== "all") {
      const logDate = new Date(log.created_at);
      const today = new Date();
      if (dateFilter === "today") {
        if (logDate.toDateString() !== today.toDateString()) return false;
      } else if (dateFilter === "7days") {
        const last7Days = new Date();
        last7Days.setDate(today.getDate() - 7);
        if (logDate < last7Days) return false;
      } else if (dateFilter === "30days") {
        const last30Days = new Date();
        last30Days.setDate(today.getDate() - 30);
        if (logDate < last30Days) return false;
      }
    }

    // Search Filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const phoneMatch = log.phone_number?.toLowerCase().includes(query);
      const templateMatch = log.template_name?.toLowerCase().includes(query);
      if (!phoneMatch && !templateMatch) return false;
    }

    return true;
  }) || [];

  // Pagination Logic
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  // Success Rate Calculation
  const totalSent = data.summary?.total_sent || 0;
  const successful = data.summary?.successful || 0;
  const successRate = totalSent > 0 ? Math.round((successful / totalSent) * 100) : 0;

  // Donut Chart Data
  const donutData = [
    { name: "Delivered", value: successful, color: "#10b981" },
    { name: "Failed", value: data.summary?.failed || 0, color: "#ef4444" }
  ];

  // Shadcn UI Card Component adapted for LeadOS Theme
  const Card = ({ children, style, className }) => (
    <div style={{
      background: "#0c1525",
      border: "1px solid #1a2e4a",
      borderRadius: "8px",
      boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      ...style
    }}>
      {children}
    </div>
  );

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#040812", 
      color: "#e2e8f0", 
      fontFamily: "Inter, sans-serif", 
      padding: "40px 60px",
      WebkitFontSmoothing: "antialiased"
    }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        
        {/* Page Header (Shadcn Style) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "32px", paddingBottom: "24px", borderBottom: "1px solid #1a2e4a" }}>
          <div style={{ flex: "1 1 auto" }}>
            <h1 style={{ fontSize: "30px", fontWeight: "700", margin: "0 0 6px 0", letterSpacing: "-0.025em" }}>
              API Tracker
            </h1>
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
              Monitor and manage your WhatsApp API transmission logs.
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={exportToCSV} style={{ 
              padding: "9px 16px", 
              background: "transparent", 
              color: "#38bdf8", 
              border: "1px solid rgba(56, 189, 248, 0.3)", 
              borderRadius: "6px", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              fontSize: "14px",
              fontWeight: "500",
              transition: "background 0.15s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "rgba(56, 189, 248, 0.1)"}
            onMouseOut={e => e.currentTarget.style.background = "transparent"}
            >
              <Download size={16} /> Export CSV
            </button>
            <button onClick={() => navigate('/alliance-tracker/docs')} style={{ 
              padding: "9px 16px", 
              background: "#0c1525", 
              color: "#e2e8f0", 
              border: "1px solid #1a2e4a", 
              borderRadius: "6px", 
              cursor: "pointer", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px", 
              fontSize: "14px",
              fontWeight: "500",
              transition: "background 0.15s"
            }}
            onMouseOver={e => e.currentTarget.style.background = "#1a2e4a"}
            onMouseOut={e => e.currentTarget.style.background = "#0c1525"}
            >
              <Terminal size={16} /> View API
            </button>
            <button onClick={fetchData} style={{ 
              padding: "9px 16px", 
              background: "#f8fafc", 
              color: "#0f172a", 
              border: "none", 
              borderRadius: "6px", 
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "opacity 0.15s"
            }}
            onMouseOver={e => e.currentTarget.style.opacity = "0.9"}
            onMouseOut={e => e.currentTarget.style.opacity = "1"}
            >
              Refresh Data
            </button>
          </div>
        </div>

        {/* Modal for Detailed JSON View */}
        {selectedLog && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(4, 8, 18, 0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div style={{ background: "#0c1525", border: "1px solid #1a2e4a", borderRadius: "12px", width: "600px", maxWidth: "90%", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a2e4a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <FileJson size={20} color="#38bdf8" />
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#f8fafc" }}>Detailed Log Data</h3>
                </div>
                <button onClick={() => setSelectedLog(null)} style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}><X size={20} /></button>
              </div>
              <div style={{ padding: "24px" }}>
                <div style={{ marginBottom: "16px", display: "flex", gap: "16px" }}>
                  <div><span style={{ color: "#64748b", fontSize: "12px" }}>Status:</span> <span style={{ color: selectedLog.status === "success" ? "#10b981" : "#ef4444", fontWeight: "600", fontSize: "14px" }}>{selectedLog.status.toUpperCase()}</span></div>
                  <div><span style={{ color: "#64748b", fontSize: "12px" }}>Destination:</span> <span style={{ color: "#e2e8f0", fontSize: "14px" }}>+{selectedLog.phone_number}</span></div>
                </div>
                <div style={{ background: "#060b14", padding: "16px", borderRadius: "8px", border: "1px solid #1a2e4a", overflowX: "auto" }}>
                  <pre style={{ margin: 0, fontSize: "13px", color: "#a8b5c8", fontFamily: "ui-monospace, monospace" }}>
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shadcn Metric Cards - Added Success Rate Donut */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          
          <Card style={{ padding: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "500", color: "#f8fafc", marginBottom: "8px" }}>Success Rate</div>
              <div style={{ fontSize: "32px", fontWeight: "700", color: successRate > 90 ? "#10b981" : "#f59e0b", letterSpacing: "-0.025em" }}>{successRate}%</div>
              <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>Overall delivery health</p>
            </div>
            <div style={{ height: "80px", width: "80px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} innerRadius={25} outerRadius={35} paddingAngle={2} dataKey="value" stroke="none">
                    {donutData.map((entry, index) => <Cell key={`cell-\${index}`} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: "500", color: "#f8fafc" }}>Total Dispatched</div>
              <Send size={16} color="#64748b" />
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#f8fafc", letterSpacing: "-0.025em" }}>{totalSent}</div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>Total API requests</p>
          </Card>
          
          <Card style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: "500", color: "#f8fafc" }}>Delivered</div>
              <CheckCircle2 size={16} color="#10b981" />
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#10b981", letterSpacing: "-0.025em" }}>{successful}</div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>Reached Meta Graph</p>
          </Card>
          
          <Card style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: "500", color: "#f8fafc" }}>Failed Attempts</div>
              <XCircle size={16} color="#ef4444" />
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#ef4444", letterSpacing: "-0.025em" }}>{data.summary?.failed || 0}</div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0 0" }}>Requires attention</p>
          </Card>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {/* Sender Breakdown Chart */}
          <Card style={{ padding: "24px" }}>
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px 0", letterSpacing: "-0.025em" }}>Usage by Sender</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>Distribution of messages across users/systems.</p>
            </div>
            <div style={{ height: "260px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sender_breakdown || []} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="sender_name" type="category" stroke="#94a3b8" width={100} axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip cursor={{fill: "#1a2e4a"}} contentStyle={{ background: "#0c1525", border: "1px solid #1a2e4a", borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", fontSize: "12px" }} itemStyle={{ color: "#e2e8f0", fontWeight: "500" }} />
                  <Bar dataKey="messages_sent" radius={[0, 4, 4, 0]} barSize={28}>
                    {(data.sender_breakdown || []).map((entry, index) => (
                      <Cell key={`cell-sender-\${index}`} fill={["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Project Breakdown Chart */}
          <Card style={{ padding: "24px" }}>
            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px 0", letterSpacing: "-0.025em" }}>Usage by Project</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>Volume of requests generated per project.</p>
            </div>
            <div style={{ height: "260px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.project_breakdown || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="project_name" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} fontSize={12} />
                  <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} fontSize={12} />
                  <Tooltip cursor={{fill: "#1a2e4a"}} contentStyle={{ background: "#0c1525", border: "1px solid #1a2e4a", borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", fontSize: "12px" }} itemStyle={{ color: "#e2e8f0", fontWeight: "500" }} />
                  <Bar dataKey="messages_sent" radius={[4, 4, 0, 0]} barSize={40}>
                    {(data.project_breakdown || []).map((entry, index) => (
                      <Cell key={`cell-project-\${index}`} fill={["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"][(index + 1) % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Detailed Logs Table (Shadcn Table Style) */}
        <Card style={{ overflow: "hidden" }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #1a2e4a", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: "1 1 auto" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px 0", letterSpacing: "-0.025em" }}>Transmission Logs</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>Detailed history of the latest API requests. Click a row to view JSON.</p>
            </div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              {/* Search Bar */}
              <div style={{ position: "relative" }}>
                <Search size={14} color="#64748b" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input 
                  type="text" 
                  placeholder="Search number or template..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: "#040812", color: "#e2e8f0", border: "1px solid #1a2e4a", padding: "8px 12px 8px 32px", borderRadius: "6px", outline: "none", fontSize: "13px", width: "200px" }}
                />
              </div>

              {/* Date Filter */}
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ appearance: "none", background: "#040812", color: "#e2e8f0", border: "1px solid #1a2e4a", padding: "8px 32px 8px 12px", borderRadius: "6px", outline: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>

              {/* Status Filter */}
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ appearance: "none", background: "#040812", color: "#e2e8f0", border: "1px solid #1a2e4a", padding: "8px 32px 8px 12px", borderRadius: "6px", outline: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>
                <option value="All">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
              
              {/* Sender Filter */}
              <select value={filterSender} onChange={e => setFilterSender(e.target.value)} style={{ appearance: "none", background: "#040812", color: "#e2e8f0", border: "1px solid #1a2e4a", padding: "8px 32px 8px 12px", borderRadius: "6px", outline: "none", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}>
                <option value="All">All Senders</option>
                {(data.sender_breakdown || []).map(s => (
                  <option key={s.sender_name} value={s.sender_name}>{s.sender_name || "Unknown"}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1a2e4a", color: "#94a3b8", fontSize: "14px", fontWeight: "500" }}>
                  <th style={{ padding: "16px 24px", fontWeight: "500" }}>Timestamp</th>
                  <th style={{ padding: "16px 24px", fontWeight: "500" }}>Origin</th>
                  <th style={{ padding: "16px 24px", fontWeight: "500" }}>Destination</th>
                  <th style={{ padding: "16px 24px", fontWeight: "500" }}>Payload Type</th>
                  <th style={{ padding: "16px 24px", fontWeight: "500" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentLogs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    style={{ borderBottom: "1px solid #1a2e4a", fontSize: "14px", transition: "background 0.15s", cursor: "pointer" }} 
                    onMouseOver={e => e.currentTarget.style.background="#1a2e4a"} 
                    onMouseOut={e => e.currentTarget.style.background="transparent"}
                  >
                    <td style={{ padding: "16px 24px", color: "#94a3b8" }}>
                      <div style={{ color: "#e2e8f0" }}>{new Date(log.created_at).toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"})}</div>
                      <div style={{ fontSize: "12px", marginTop: "4px" }}>{new Date(log.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontWeight: "500", color: "#e2e8f0" }}>{log.sender_name || "-"}</span>
                        <span style={{ color: "#64748b", fontSize: "12px" }}>{log.project_name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", color: "#e2e8f0", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                      +{log.phone_number}
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {log.message_type === "template" ? (
                          <span style={{ background: "#1a2e4a", color: "#e2e8f0", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "500" }}>
                            {log.template_name}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "13px" }}>Free Text</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px" }}>
                      {log.status === "success" ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#10b981", fontSize: "13px", fontWeight: "500" }}>
                          <CheckCircle2 size={14} /> Delivered
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#ef4444", fontSize: "13px", fontWeight: "500" }}>
                            <XCircle size={14} /> Failed
                          </div>
                          <span style={{ fontSize: "12px", color: "#94a3b8", maxWidth: "250px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={log.error_message}>
                            {log.error_message}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: "64px", textAlign: "center", color: "#64748b" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <AlertCircle size={24} />
                        <span style={{ fontSize: "14px" }}>No results found for your filters.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ padding: "16px 24px", display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1a2e4a", background: "#0c1525" }}>
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                Showing {indexOfFirstLog + 1} to {Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} entries
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ padding: "6px 12px", background: currentPage === 1 ? "#040812" : "#1a2e4a", color: currentPage === 1 ? "#64748b" : "#e2e8f0", border: "1px solid #1a2e4a", borderRadius: "6px", cursor: currentPage === 1 ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "500", transition: "0.2s" }}
                  onMouseOver={e => !e.currentTarget.disabled && (e.currentTarget.style.background = "#243b5e")}
                  onMouseOut={e => !e.currentTarget.disabled && (e.currentTarget.style.background = "#1a2e4a")}
                >
                  Previous
                </button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "0 12px", fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                  Page {currentPage} of {totalPages}
                </div>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ padding: "6px 12px", background: currentPage === totalPages ? "#040812" : "#1a2e4a", color: currentPage === totalPages ? "#64748b" : "#e2e8f0", border: "1px solid #1a2e4a", borderRadius: "6px", cursor: currentPage === totalPages ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: "500", transition: "0.2s" }}
                  onMouseOver={e => !e.currentTarget.disabled && (e.currentTarget.style.background = "#243b5e")}
                  onMouseOut={e => !e.currentTarget.disabled && (e.currentTarget.style.background = "#1a2e4a")}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
