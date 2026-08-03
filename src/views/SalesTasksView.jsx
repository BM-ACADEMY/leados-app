import React, { useState, useEffect } from 'react';
import { C } from '../constants/theme.js';
import { api } from '../services/api.js';
import { RefreshCw, User, Trash2, X, AlertTriangle, ChevronDown, ChevronUp, MessageSquare, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { io as socketIO } from 'socket.io-client';

export const SalesTasksView = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [notesTask, setNotesTask] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [search, setSearch] = useState('');
  const tasksPerPage = 10;

  useEffect(() => {
    fetchTasks();
    const socket = socketIO(api.baseUrl, { transports: ['websocket', 'polling'] });
    socket.on('sales_task_update', fetchTasks);
    return () => socket.disconnect();
  }, []);

  const openLead = async (leadId) => {
    try { await api.put(`/sales-tasks/lead/${leadId}/read`, {}); } catch { /* navigation should still work */ }
    setTasks(current => current.map(task => task.lead_id === leadId ? { ...task, unread: false } : task));
    navigate('/inbox', { state: { leadId } });
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales-tasks');
      if (res.success) {
        setTasks(res.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
      toast.error('Failed to refresh tasks');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await api.put(`/sales-tasks/${id}/status`, { status });
      if (res.success) {
        setTasks(current => status === 'completed'
          ? current.filter(t => t.id !== id)
          : current.map(t => t.id === id ? { ...t, status: res.task.status } : t));
        toast.success(`Task marked as ${status}`);
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update task status');
    }
  };

  const executeDeleteTask = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/sales-tasks/${deleteConfirmId}`);
      if (res.success) {
        setTasks(tasks.filter(t => t.id !== deleteConfirmId));
        toast.success('Task deleted successfully');
        setDeleteConfirmId(null);
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusStyles = (status) => {
    switch(status) {
      case 'completed': 
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' };
      case 'processing': 
        return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' };
      default: // pending
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
    }
  };

  const formatTaskType = (type) => {
    switch(type) {
      case 'hot_lead': return '🔥 Hot Lead';
      case 'call': return '📞 Scheduled Call';
      case 'followup': return '💬 Follow-up';
      case 'overdue': return '⚠️ Overdue Task';
      default: return type;
    }
  };

  const updateLeadStatus = async (leadId, status) => {
    try {
      const res = await api.put(`/sales-tasks/lead/${leadId}/sales-status`, { status });
      setTasks(current => current.map(task => task.lead_id === leadId ? { ...task, ...res.lead } : task));
      toast.success('Lead status updated');
    } catch (err) { toast.error('Failed to update lead status: ' + err.message); }
  };

  const saveNote = async () => {
    if (!noteText.trim() || !notesTask) return toast.error('Enter a note');
    setSavingNote(true);
    try {
      const res = await api.post(`/sales-tasks/lead/${notesTask.lead_id}/notes`, { note: noteText.trim() });
      setTasks(current => current.map(task => task.lead_id === notesTask.lead_id ? {
        ...task, ...res.lead, latest_sales_note: res.note.note, latest_sales_note_at: res.note.created_at,
      } : task));
      setNotesTask(null);
      setNoteText('');
      toast.success(res.lead.sales_followup_stopped ? 'Note saved — automated follow-ups stopped' : res.lead.sales_followup_at ? 'Note saved — follow-up rescheduled' : 'Note saved');
    } catch (err) { toast.error('Failed to save note: ' + err.message); }
    finally { setSavingNote(false); }
  };

  const formatDateTime = (value) => value
    ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  const normalizedSearch = search.trim().toLowerCase();
  const searchDigits = search.replace(/\D/g, '');
  const filteredTasks = tasks.filter(task => {
    if (!normalizedSearch) return true;
    const nameMatches = String(task.name || '').toLowerCase().includes(normalizedSearch);
    const phoneDigits = String(task.phone || '').replace(/\D/g, '');
    return nameMatches || Boolean(searchDigits && phoneDigits.includes(searchDigits));
  });

  useEffect(() => { setCurrentPage(1); }, [search]);

  return (
    <div className="p-mobile" style={{ padding: 26, overflowY: 'auto', height: '100%', background: C.bg, position: 'relative' }}>
      
      {/* Custom select css overrides */}
      <style>{`
        .task-status-select {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml;utf8,<svg fill='%2364748b' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/><path d='M0 0h24v24H0z' fill='none'/></svg>");
          background-repeat: no-repeat;
          background-position: right 6px center;
          background-size: 16px;
          padding-right: 22px !important;
        }
      `}</style>

      {/* --- HEADER CONTROLS --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 26 }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            Sales Tasks
            <User size={18} color={C.accent} />
          </h1>
          <p style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
            Booked demos, hot leads, and follow-ups requiring sales attention
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <div style={{ height: 38, minWidth: 240, display: 'flex', alignItems: 'center', gap: 7, padding: '0 11px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9 }}>
          <Search size={13} color={C.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone..." style={{ width: '100%', background: 'transparent', border: 0, outline: 'none', color: C.text, fontSize: 11 }} />
          {search && <button onClick={() => setSearch('')} title="Clear search" style={{ background: 'transparent', border: 0, padding: 2, cursor: 'pointer', display: 'flex' }}><X size={12} color={C.muted} /></button>}
        </div>
        <button
          onClick={fetchTasks}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            color: C.text,
            padding: '9px 16px',
            borderRadius: 9,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.background = C.border}
          onMouseLeave={e => e.currentTarget.style.background = C.surface}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh Tasks
        </button>
        </div>
      </div>

      <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 10 }}>
        <div><strong style={{ color: C.red, fontSize: 11 }}>🔥 Hot Lead</strong><p style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>Lead status is Hot and requires priority sales attention.</p></div>
        <div><strong style={{ color: C.blue, fontSize: 11 }}>📞 Scheduled Call</strong><p style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>A demo call is booked and remains active until completed or its lead status changes.</p></div>
        <div><strong style={{ color: C.purple, fontSize: 11 }}>💬 Follow-up</strong><p style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>The lead has an active next follow-up date and is not booked, converted, lost, or opted out.</p></div>
        <div><strong style={{ color: '#f59e0b', fontSize: 11 }}>⚠ Overdue</strong><p style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>The scheduled follow-up time has passed and still needs action.</p></div>
      </div>

      {/* --- TASKS TABLE --- */}
      <div className="table-responsive" style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 14, overflow: 'hidden' }}>
        {loading && tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted }}>Loading your tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <User size={36} color={C.border} />
            <span style={{ fontSize: 13 }}>{search ? 'No leads match that name or phone number.' : "No active sales tasks. You're all caught up!"}</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid ' + C.border }}>
                {['Lead', 'Contact', 'Lead Status', 'Task Type', 'Task Status', 'Notes', 'Details'].map((h) => (
                  <th key={h} style={{ padding: '12px 16px', fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const indexOfLastTask = currentPage * tasksPerPage;
                const indexOfFirstTask = indexOfLastTask - tasksPerPage;
                const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
                return currentTasks.map((task, idx) => {
                  const styles = getStatusStyles(task.status);
                  const isExpanded = expandedTaskId === task.id;
                  return (
                    <React.Fragment key={task.id}>
                    <tr 
                      onClick={() => openLead(task.lead_id)}
                    style={{ 
                      borderBottom: '1px solid ' + C.border, 
                      background: task.unread ? `${C.accent}08` : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'),
                      cursor: 'pointer',
                    }}
                  >
                    {/* Lead Detail */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: '50%',
                          background: `${C.accent}15`, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: C.accent, flexShrink: 0
                        }}>
                          {task.name ? task.name[0].toUpperCase() : 'L'}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>{task.name || 'Unknown Lead'}{task.unread && <span title="Unread" style={{ width: 7, height: 7, borderRadius: '50%', background: C.accent, display: 'inline-block' }} />}</p>
                          <span style={{ fontSize: 10, color: C.muted, textTransform: 'capitalize' }}>
                            Stage: {task.lead_status || 'New'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{task.phone || '-'}</p>
                      <p style={{ fontSize: 10, color: C.muted }}>{task.email || 'No Email'}</p>
                    </td>

                    {/* Task Type */}
                    <td style={{ padding: '14px 16px' }}>
                      <select value={task.sales_status || 'new'} onClick={e => e.stopPropagation()} onChange={e => updateLeadStatus(task.lead_id, e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 7, padding: '6px 8px', fontSize: 10, outline: 'none', cursor: 'pointer' }}>
                        <option value="new">New</option><option value="contacted">Contacted</option><option value="processing">Processing</option><option value="follow_up">Follow-up</option><option value="converted">Converted</option><option value="not_interested">Not Interested</option><option value="closed">Closed</option>
                      </select>
                    </td>

                    {/* Task Type */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        fontSize: 11, 
                        fontWeight: 600,
                        color: task.task_type === 'hot_lead' ? C.red : task.task_type === 'call' ? C.blue : C.purple, 
                        background: task.task_type === 'hot_lead' ? 'rgba(239, 68, 68, 0.1)' : task.task_type === 'call' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)', 
                        padding: '4px 10px', 
                        borderRadius: 12 
                      }}>
                        {formatTaskType(task.task_type)}
                      </span>
                    </td>

                    {/* Status Action & Delete */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <select 
                          value={task.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateStatus(task.id, e.target.value)}
                          className="task-status-select"
                          style={{
                            backgroundColor: styles.bg,
                            color: styles.text,
                            border: '1px solid ' + styles.border,
                            borderRadius: 14,
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            outline: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <option value="pending" style={{ background: C.card, color: '#f59e0b' }}>Pending</option>
                          <option value="processing" style={{ background: C.card, color: '#3b82f6' }}>Processing</option>
                          <option value="completed" style={{ background: C.card, color: '#10b981' }}>Completed</option>
                        </select>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(task.id); }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: C.muted,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            borderRadius: '4px',
                            transition: 'color 0.2s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = C.red}
                          onMouseLeave={e => e.currentTarget.style.color = C.muted}
                          title="Delete Task"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={e => { e.stopPropagation(); setNotesTask(task); setNoteText(''); }} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, borderRadius: 7, padding: '6px 9px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}><MessageSquare size={12} /> Add Note</button>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedTaskId(isExpanded ? null : task.id); }}
                        aria-expanded={isExpanded}
                        style={{ background: isExpanded ? `${C.accent}18` : 'transparent', border: `1px solid ${isExpanded ? C.accent : C.border}`, color: isExpanded ? C.accent : C.muted, padding: '6px 10px', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ background: 'rgba(255,255,255,0.018)', borderBottom: `1px solid ${C.border}` }}>
                      <td colSpan={7} style={{ padding: '0 16px 16px' }}>
                        <div onClick={e => e.stopPropagation()} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: 12, padding: 16, borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
                          {[
                            ['Brand', task.brand_name || '—'],
                            ['Source', task.source || '—'],
                            ['Interest', task.interest || '—'],
                            ['Lead Score', task.score ?? 0],
                            ['Assigned To', task.assigned_name || 'Unassigned'],
                            [task.task_type === 'call' ? 'Demo Call' : 'Next Follow-up', formatDateTime(task.task_type === 'call' ? task.call_booked_at : task.next_followup_due)],
                            ['Lead Created', formatDateTime(task.lead_created_at)],
                            ['Last Contact', formatDateTime(task.last_contact)],
                            ['Latest Sales Note', task.latest_sales_note || '—'],
                            ['Next AI Follow-up', task.sales_followup_stopped ? 'Stopped' : formatDateTime(task.sales_followup_at || task.next_followup_due)],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <p style={{ margin: 0, fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: .6 }}>{label}</p>
                              <p style={{ margin: '4px 0 0', fontSize: 11, color: C.text, fontWeight: 600 }}>{value}</p>
                            </div>
                          ))}
                          {task.unread && <button onClick={() => openLead(task.lead_id)} style={{ alignSelf: 'center', justifySelf: 'start', background: `${C.accent}18`, color: C.accent, border: `1px solid ${C.accent}55`, borderRadius: 7, padding: '7px 10px', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>Mark as Read & Open Chat</button>}
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {filteredTasks.length > tasksPerPage && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: C.card, borderTop: '1px solid ' + C.border }}>
            <span style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>
              Showing {((currentPage - 1) * tasksPerPage) + 1} to {Math.min(currentPage * tasksPerPage, filteredTasks.length)} of {filteredTasks.length} entries
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid ' + C.border, borderRadius: 6, color: currentPage === 1 ? C.muted : C.text, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
              >
                Previous
              </button>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                Page {currentPage} of {Math.ceil(filteredTasks.length / tasksPerPage)}
              </span>
              <button 
                disabled={currentPage === Math.ceil(filteredTasks.length / tasksPerPage)}
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTasks.length / tasksPerPage), p + 1))}
                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid ' + C.border, borderRadius: 6, color: currentPage === Math.ceil(filteredTasks.length / tasksPerPage) ? C.muted : C.text, cursor: currentPage === Math.ceil(filteredTasks.length / tasksPerPage) ? 'not-allowed' : 'pointer', opacity: currentPage === Math.ceil(filteredTasks.length / tasksPerPage) ? 0.5 : 1, fontSize: 13, fontWeight: 500, transition: 'all 0.2s' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {notesTask && (
        <div onClick={() => !savingNote && setNotesTask(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><h3 style={{ margin: 0, color: C.text, fontSize: 15 }}>Add Sales Note</h3><p style={{ margin: '3px 0 0', color: C.muted, fontSize: 10 }}>{notesTask.name}</p></div><button onClick={() => setNotesTask(null)} style={{ background: 'transparent', border: 0, cursor: 'pointer' }}><X size={16} color={C.muted} /></button></div>
            {notesTask.latest_sales_note && <div style={{ marginTop: 14, padding: 10, background: C.surface, borderRadius: 8, color: C.muted, fontSize: 10 }}><strong style={{ color: C.text }}>Latest note:</strong> {notesTask.latest_sales_note}</div>}
            <textarea autoFocus value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Example: Customer requested a callback tomorrow at 5 PM." rows={5} style={{ width: '100%', marginTop: 14, resize: 'vertical', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, padding: 12, fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            <p style={{ color: C.dim, fontSize: 9, lineHeight: 1.5, marginTop: 7 }}>AI evaluates this note before future messages. “Already enrolled”, “Not interested”, or “Do not contact” stops automation. A future callback time reschedules it.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 15 }}><button onClick={() => setNotesTask(null)} disabled={savingNote} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button><button onClick={saveNote} disabled={savingNote} style={{ background: C.accent, border: 0, color: '#fff', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: savingNote ? 'wait' : 'pointer' }}>{savingNote ? 'Analyzing & Saving...' : 'Save Note'}</button></div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 12, width: '100%', maxWidth: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid ' + C.border, background: C.card }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color={C.red} />
                Delete Task
              </h3>
              <button onClick={() => setDeleteConfirmId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '24px 20px', color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
              Are you sure you want to permanently delete this task? This action cannot be undone and will remove the task history.
            </div>
            <div style={{ padding: '16px 20px', background: C.card, borderTop: '1px solid ' + C.border, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={() => setDeleteConfirmId(null)}
                style={{ background: 'transparent', border: '1px solid ' + C.border, color: C.text, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={executeDeleteTask}
                disabled={isDeleting}
                style={{ background: C.red, border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.7 : 1 }}
              >
                {isDeleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
