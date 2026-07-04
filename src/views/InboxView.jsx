import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Send, ChevronLeft, Wifi, WifiOff } from 'lucide-react';
import { io as socketIO } from 'socket.io-client';
import { C } from '../constants/theme.js';
import { useLeads, useLead } from '../hooks/useLeads.js';
import { api } from '../services/api.js';

// In local dev (localhost), connect via same origin so Vite's WebSocket proxy works.
// In production, connect directly to the API server.
const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SOCKET_URL = isLocalDev ? window.location.origin : (import.meta.env.VITE_API_URL || 'https://leados-api.abmgroups.org');

export const InboxView = () => {
  const [search, setSearch] = useState('');
  const { leads, loading: loadingLeads, refetch: refetchLeadsList } = useLeads({ search });
  const [activeLeadId, setActiveLeadId] = useState(null);
  const { lead: activeLead, conversations, refetch: refetchLead, loading: loadingLead } = useLead(activeLeadId);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [localMessages, setLocalMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  // Auto-select first lead
  useEffect(() => {
    if (leads && leads.length > 0 && !activeLeadId) {
      setActiveLeadId(leads[0].id);
    }
  }, [leads, activeLeadId]);

  // Sync server-fetched conversations into localMessages
  useEffect(() => {
    setLocalMessages(conversations || []);
  }, [conversations]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  // Refs to hold latest values for socket listeners without causing re-connects
  const activeLeadIdRef = useRef(activeLeadId);
  const refetchLeadsListRef = useRef(refetchLeadsList);

  useEffect(() => {
    activeLeadIdRef.current = activeLeadId;
    refetchLeadsListRef.current = refetchLeadsList;
  }, [activeLeadId, refetchLeadsList]);

  // ── SOCKET.IO CONNECTION ────────────────────────────────────
  useEffect(() => {
    const socket = socketIO(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Start with HTTP polling, then upgrade to WS (safer through Vite proxy)
      withCredentials: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Socket.io] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('[Socket.io] Disconnected');
    });

    // New inbound message received from a customer
    socket.on('incoming_message', ({ lead_id, message }) => {
      // Refresh sidebar lead list to show new last_contact time
      refetchLeadsListRef.current();
      // If the active conversation is for this lead, append the message
      if (lead_id === activeLeadIdRef.current) {
        setLocalMessages((prev) => {
          const exists = prev.some((m) => m.id === message.id);
          return exists ? prev : [...prev, message];
        });
      }
    });

    // Our own outbound message confirmed by server
    socket.on('outgoing_message', ({ lead_id, message }) => {
      refetchLeadsListRef.current();
      if (lead_id === activeLeadIdRef.current) {
        setLocalMessages((prev) => {
          const exists = prev.some((m) => m.id === message.id);
          return exists ? prev : [...prev, message];
        });
      }
    });

    // Status update (sent → delivered → read)
    socket.on('message_status', ({ wa_message_id, status }) => {
      setLocalMessages((prev) =>
        prev.map((m) => (m.wa_message_id === wa_message_id ? { ...m, status } : m))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Empty dependency array ensures it connects only once!

  const handleSend = async (e) => {
    e.preventDefault();
    if (!msg.trim() || !activeLeadId || sending) return;
    setSending(true);
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      direction: 'outbound',
      content: msg,
      status: 'sending',
      timestamp: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, optimisticMsg]);
    setMsg('');
    try {
      await api.sendWhatsAppMessage(activeLeadId, optimisticMsg.content);
      // The socket event will replace this once the server confirms
    } catch (err) {
      // Remove optimistic message and show error
      setLocalMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setMsg(optimisticMsg.content);
      alert('Failed to send message: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  const displayLeads = leads || [];
  const activeObj = displayLeads.find((l) => l.id === activeLeadId) || displayLeads[0];

  const getMessageText = (m) => m.content || m.message || m.text || '';
  const getMessageTime = (m) => {
    const raw = m.timestamp || m.sent_at || m.time;
    if (!raw) return '';
    return new Date(raw).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      {/* ── SIDEBAR ─────────────────────────────────── */}
      <div
        className={showChatOnMobile ? 'hide-mobile' : 'w-full-mobile'}
        style={{ width: 290, borderRight: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', flexShrink: 0 }}
      >
        <div style={{ padding: '18px 14px', borderBottom: '1px solid ' + C.border }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 }}>
            <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: C.text }}>WhatsApp Inbox</h2>
            <div title={connected ? 'Live – Socket.io connected' : 'Polling mode'} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: connected ? C.green : C.muted }}>
              {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
              <span>{connected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.card, border: '1px solid ' + C.border, borderRadius: 7, padding: '7px 11px' }}>
            <Search size={11} color={C.muted} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 11, outline: 'none', width: '100%' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {displayLeads.map((l) => (
            <div
              key={l.id}
              onClick={() => { setActiveLeadId(l.id); setShowChatOnMobile(true); }}
              style={{ padding: '13px 14px', borderBottom: '1px solid ' + C.border, cursor: 'pointer', background: activeLeadId === l.id ? C.accent + '10' : 'transparent', borderLeft: activeLeadId === l.id ? '3px solid ' + C.accent : '3px solid transparent' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>
                    {l.name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{l.name}</p>
                    <p style={{ fontSize: 9, color: C.muted }}>{l.brand_name || l.brand || 'Manual'}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 9, color: C.dim }}>{l.last_contact ? new Date(l.last_contact).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                </div>
              </div>
              <p style={{ fontSize: 10, color: C.muted, paddingLeft: 40, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {l.interest || 'No custom details'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CHAT PANEL ──────────────────────────────── */}
      <div className={!showChatOnMobile ? 'hide-mobile' : 'w-full-mobile'} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <button className="show-mobile" onClick={() => setShowChatOnMobile(false)} style={{ background: 'transparent', border: 'none', color: C.muted, display: 'none' }}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.accent }}>
              {activeObj?.name?.[0]}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{activeObj?.name}</p>
              <p style={{ fontSize: 9, color: C.green }}>AI Agent Active - {activeObj?.brand_name || activeObj?.brand || 'Manual'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 7, padding: '5px 11px', color: C.muted, fontSize: 11 }}>Take Over</button>
            <button style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: 7, padding: '5px 11px', color: C.muted, fontSize: 11 }}>View Lead</button>
          </div>
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 11, background: C.bg + '88' }}>
          {loadingLead && localMessages.length === 0 && (
            <p style={{ textAlign: 'center', color: C.muted, fontSize: 11 }}>Loading conversation…</p>
          )}
          {!loadingLead && localMessages.length === 0 && (
            <p style={{ textAlign: 'center', color: C.muted, fontSize: 11 }}>No messages yet. Start the conversation!</p>
          )}
          {localMessages.map((m, i) => {
            const isLead = m.direction === 'inbound' || m.from === 'lead';
            const isAI = m.sender === 'ai' || m.from === 'ai';
            const isSending = m.id?.toString().startsWith('optimistic-');
            return (
              <div key={m.id || i} style={{ display: 'flex', justifyContent: isLead ? 'flex-start' : 'flex-end', opacity: isSending ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                <div style={{ maxWidth: '60%', background: isLead ? C.card : C.accent + '20', border: '1px solid ' + (isLead ? C.border : C.accentDim), borderRadius: isLead ? '4px 13px 13px 13px' : '13px 4px 13px 13px', padding: '9px 13px' }}>
                  {isAI && <p style={{ fontSize: 8, color: C.accent, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>AI AGENT</p>}
                  {!isLead && !isAI && <p style={{ fontSize: 8, color: C.blue, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>HUMAN AGENT</p>}
                  <p style={{ fontSize: 12, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{getMessageText(m)}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 4 }}>
                    <p style={{ fontSize: 9, color: C.muted }}>{isSending ? 'Sending…' : getMessageTime(m)}</p>
                    {!isLead && m.status && !isSending && (
                      <span style={{ fontSize: 8, color: m.status === 'read' ? C.blue : m.status === 'delivered' ? C.green : C.muted }}>
                        {m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : m.status === 'sent' ? '✓' : m.status === 'failed' ? '✗' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{ padding: 14, borderTop: '1px solid ' + C.border, display: 'flex', gap: 9 }}>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Type manual message (overrides AI for this reply)..."
            style={{ flex: 1, background: C.card, border: '1px solid ' + C.border, borderRadius: 11, padding: '10px 13px', color: C.text, fontSize: 12, outline: 'none' }}
          />
          <button type="submit" disabled={sending} style={{ background: C.accent, border: 'none', width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
            <Send size={15} color='#fff' />
          </button>
        </form>
      </div>
    </div>
  );
};
