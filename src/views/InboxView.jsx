import { useState, useEffect } from 'react';
import { Search, Send, ChevronLeft } from 'lucide-react';
import { C } from '../constants/theme.js';
import { useLeads, useLead } from '../hooks/useLeads.js';
import { api } from '../services/api.js';

export const InboxView = () => {
  const [search, setSearch] = useState('');
  const { leads, loading: loadingLeads, refetch: refetchLeadsList } = useLeads({ search });
  const [activeLeadId, setActiveLeadId] = useState(null);
  const { lead: activeLead, conversations, refetch: refetchLead, loading: loadingLead } = useLead(activeLeadId);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  useEffect(() => {
    if (leads && leads.length > 0 && !activeLeadId) {
      setActiveLeadId(leads[0].id);
    }
  }, [leads, activeLeadId]);

  // Poll for new messages and sidebar updates
  useEffect(() => {
    const listInterval = setInterval(() => {
      refetchLeadsList();
    }, 15000); // Poll list every 15s

    if (!activeLeadId) return () => clearInterval(listInterval);

    const leadInterval = setInterval(() => {
      refetchLead();
    }, 5000); // Poll active conversation every 5s

    return () => {
      clearInterval(listInterval);
      clearInterval(leadInterval);
    };
  }, [activeLeadId, refetchLead, refetchLeadsList]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!msg.trim() || !activeLeadId || sending) return;
    setSending(true);
    try {
      await api.sendWhatsAppMessage(activeLeadId, msg);
      setMsg('');
      refetchLead();
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const displayLeads = leads || [];
  const activeObj = displayLeads.find(l => l.id === activeLeadId) || displayLeads[0];
  const displayConvo = activeLeadId && activeLead ? conversations : [];

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      <div className={showChatOnMobile ? 'hide-mobile' : 'w-full-mobile'} style={{ width: 290, borderRight: '1px solid ' + C.border, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 14px', borderBottom: '1px solid ' + C.border }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 11 }}>WhatsApp Inbox</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: C.card, border: '1px solid ' + C.border, borderRadius: 7, padding: '7px 11px' }}>
            <Search size={11} color={C.muted} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ background: 'transparent', border: 'none', color: C.text, fontSize: 11, outline: 'none', width: '100%' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {displayLeads.map((l) => (
            <div key={l.id} onClick={() => { setActiveLeadId(l.id); setShowChatOnMobile(true); }} style={{ padding: '13px 14px', borderBottom: '1px solid ' + C.border, cursor: 'pointer', background: activeLeadId === l.id ? C.accent + '10' : 'transparent', borderLeft: activeLeadId === l.id ? '3px solid ' + C.accent : '3px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{l.name[0]}</div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{l.name}</p>
                    <p style={{ fontSize: 9, color: C.muted }}>{l.brand_name || l.brand || 'Manual'}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 9, color: C.dim }}>{l.last_contact ? new Date(l.last_contact).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</p>
                </div>
              </div>
              <p style={{ fontSize: 10, color: C.muted, paddingLeft: 40, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.interest || 'No custom details'}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={!showChatOnMobile ? 'hide-mobile' : 'w-full-mobile'} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid ' + C.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <button className="show-mobile" onClick={() => setShowChatOnMobile(false)} style={{ background: 'transparent', border: 'none', color: C.muted, display: 'none' }}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accent + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.accent }}>{activeObj?.name[0]}</div>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 11, background: C.bg + '88' }}>
          {displayConvo.map((m, i) => {
            const isLead = m.direction === 'inbound' || m.from === 'lead';
            const isAI = m.sender === 'ai' || m.from === 'ai';
            return (
              <div key={i} style={{ display: 'flex', justifyContent: isLead ? 'flex-start' : 'flex-end' }}>
                <div style={{ maxWidth: '60%', background: isLead ? C.card : C.accent + '20', border: '1px solid ' + (isLead ? C.border : C.accentDim), borderRadius: isLead ? '4px 13px 13px 13px' : '13px 4px 13px 13px', padding: '9px 13px' }}>
                  {isAI && <p style={{ fontSize: 8, color: C.accent, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>AI AGENT</p>}
                  {!isLead && !isAI && <p style={{ fontSize: 8, color: C.blue, fontWeight: 700, letterSpacing: 0.8, marginBottom: 4 }}>HUMAN AGENT</p>}
                  <p style={{ fontSize: 12, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{m.message || m.text}</p>
                  <p style={{ fontSize: 9, color: C.muted, marginTop: 4, textAlign: 'right' }}>
                    {m.sent_at ? new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : m.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={handleSend} style={{ padding: 14, borderTop: '1px solid ' + C.border, display: 'flex', gap: 9 }}>
          <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Type manual message (overrides AI for this reply)..." style={{ flex: 1, background: C.card, border: '1px solid ' + C.border, borderRadius: 11, padding: '10px 13px', color: C.text, fontSize: 12, outline: 'none' }} />
          <button type="submit" disabled={sending} style={{ background: C.accent, border: 'none', width: 42, height: 42, borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Send size={15} color='#fff' />
          </button>
        </form>
      </div>
    </div>
  );
};
