import React, { useState, useEffect, useRef } from 'react';
import { C } from '../../constants/theme.js';
import { 
  Loader2, MapPin, Star, MessageCircle, Eye, Search, 
  MousePointerClick, CheckCircle, Megaphone, Send, LogOut,
  Image as ImageIcon, Shield, Sparkles, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const getFriendlyGoogleError = (err) => {
  if (!err) return { title: 'Google API Connection Error', desc: 'An unknown connection error occurred.' };
  try {
    const parsed = typeof err === 'string' ? JSON.parse(err) : err;
    const errorObj = parsed?.error || parsed;
    const code = errorObj?.code;
    const message = errorObj?.message || '';

    if (code === 429 || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate limit')) {
      return {
        title: 'Google API Rate Limit Exceeded',
        desc: 'Google APIs have temporarily rate-limited requests for this account. Please wait a few minutes before trying again.'
      };
    }
    if (code === 403 || message.toLowerCase().includes('permission') || message.toLowerCase().includes('access denied') || message.toLowerCase().includes('forbidden')) {
      return {
        title: 'Google Profile Access Forbidden',
        desc: 'The authenticated Google account does not have Owner or Manager permissions to access these reviews. Please make sure the account is authorized.'
      };
    }
    if (code === 401 || message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('token expired')) {
      return {
        title: 'Google Session Expired',
        desc: 'Your Google Business Profile connection has expired. Please re-authenticate the Google account.'
      };
    }

    return {
      title: `Google API Error (Status ${code || 'Unknown'})`,
      desc: message || 'An unexpected issue occurred while communicating with Google Business Profile. Please try again later.'
    };
  } catch (e) {
    return {
      title: 'Google API Connection Error',
      desc: typeof err === 'string' ? err : 'A connection error occurred.'
    };
  }
};

export default function Loyalty() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState(null);


  // Reply states
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // 1. Fetch GMB Clients list
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`/api/mafiya/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const clientsData = await res.json();
        setClients(clientsData);
        if (clientsData.length > 0) {
          setActiveClient(clientsData[0]);
        } else {
          setLoading(false);
        }
      } else {
        toast.error('Failed to load GMB clients (Server responded with error)');
        setLoading(false);
      }
    } catch (err) {
      console.error('Fetch clients error:', err);
      toast.error('Failed to load GMB clients');
      setLoading(false);
    }
  };

  // 2. Fetch Review data for selected client
  const fetchReviewData = async (clientId, mode) => {
    if (!clientId) return;
    setDataLoading(true);
    try {
      const token = localStorage.getItem('leados_token');
      
      // Get Status
      const statusRes = await fetch(`/api/mafiya/reviews/status?clientId=${clientId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-data-mode': mode
        }
      });
      const statusData = await statusRes.json();
      setConnected(statusData.connected);

      // Get Data
      const dataRes = await fetch(`/api/mafiya/reviews/data?clientId=${clientId}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'x-data-mode': mode
        }
      });
      if (dataRes.ok) {
        const details = await dataRes.json();
        setData(details);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error('Fetch review data error:', err);
      toast.error('Failed to load reviews');
    } finally {
      setDataLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (activeClient) {
      fetchReviewData(activeClient.id, 'real');
    }
  }, [activeClient]);

  const submitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch('/api/mafiya/reviews/reply-review', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          clientId: activeClient.id, 
          reviewId, 
          replyText 
        })
      });

      if (!res.ok) throw new Error('Failed to submit reply');
      
      // Optimistic update
      const updatedReviews = data.recentReviews.map(r => 
        r.id === reviewId ? { ...r, replied: true, replyText } : r
      );
      setData({ ...data, recentReviews: updatedReviews });
      toast.success('Reply submitted successfully!');
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit reply.');
    } finally {
      setSubmittingReply(false);
    }
  };


  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: C.background }}>
        <Loader2 size={32} color={C.accent} className="spin" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div style={{ padding: 40, color: C.text, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.background }}>
        <Shield size={48} style={{ opacity: 0.15, marginBottom: 16 }} color="#fff" />
        <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 8 }}>No GMB Clients Configured</h2>
        <p style={{ color: C.muted, textAlign: 'center', maxWidth: 400 }}>Please onboard GMB clients in the Mafiya OS section first to start managing reviews.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif", display: 'flex', alignItems: 'center', gap: 10 }}>
              🤝 Loyalty (Review)
            </h1>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: 0.5, border: '1px solid rgba(16,185,129,0.2)' }}>
              Reputation
            </span>
          </div>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>
            Manage GMB reviews, ratings, and customer sentiment for <strong style={{ color: '#fff' }}>{activeClient?.business_name}</strong>
          </p>
        </div>

        {/* Dropdown & Demo Mode controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

          <select
            value={activeClient?.id || ''}
            onChange={(e) => {
              const selected = clients.find(c => c.id === parseInt(e.target.value, 10));
              if (selected) setActiveClient(selected);
            }}
            style={{ 
              background: '#0f172a', 
              border: `1px solid ${C.border}`, 
              borderRadius: 8, 
              padding: '8px 16px', 
              color: '#e2e8f0', 
              fontSize: 13, 
              outline: 'none', 
              cursor: 'pointer',
              height: 38
            }}
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.business_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <>
          {/* GMB Warning notice if not connected */}
          {!connected && (
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: 14 }}>GMB Authorization Required</span>
                <p style={{ margin: '4px 0 0 0', color: C.muted, fontSize: 13 }}>
                  This client has not authenticated their Google Business Profile yet. Email verification was sent to <strong style={{ color: '#fff' }}>{activeClient?.gmb_email || 'configured email'}</strong>. Currently showing public listings via search scrape.
                </p>
              </div>
            </div>
          )}

          {/* INSIGHTS CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 30 }}>
            {/* Views */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: 10, borderRadius: 10 }}>
                  <Eye size={20} color="#3b82f6" />
                </div>
                <h3 style={{ color: C.muted, fontSize: 14, fontWeight: 600, margin: 0 }}>Total Views</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{data?.insights?.views?.toLocaleString() || '0'}</span>
                <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{data?.insights?.viewsTrend || '0%'}</span>
              </div>
            </div>

            {/* Searches */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: 10, borderRadius: 10 }}>
                  <Search size={20} color="#a855f7" />
                </div>
                <h3 style={{ color: C.muted, fontSize: 14, fontWeight: 600, margin: 0 }}>Direct Searches</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{data?.insights?.searches?.toLocaleString() || '0'}</span>
                <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{data?.insights?.searchesTrend || '0%'}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 10 }}>
                  <MousePointerClick size={20} color="#f59e0b" />
                </div>
                <h3 style={{ color: C.muted, fontSize: 14, fontWeight: 600, margin: 0 }}>Customer Actions</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{data?.insights?.actions?.toLocaleString() || '0'}</span>
                <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{data?.insights?.actionsTrend || '0%'}</span>
              </div>
            </div>
          </div>

          <div style={{ width: '100%' }}>
            {/* REVIEWS MANAGER */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <MessageCircle size={20} color={C.accent} />
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>Recent Reviews</h2>
                <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                  {data?.business?.rating || '0.0'} ★ ({data?.business?.totalReviews || 0})
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {dataLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader2 size={28} color={C.accent} className="spin" />
                  </div>
                ) : data?.recentReviews && data.recentReviews.length > 0 ? (
                  data.recentReviews.map(review => (
                    <div key={review.id} style={{ borderBottom: `1px solid ${C.border}50`, paddingBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{review.author}</span>
                        <span style={{ color: C.muted, fontSize: 12 }}>{review.date}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                        {[1,2,3,4,5].map(star => (
                          <Star key={star} size={14} fill={star <= review.rating ? '#facc15' : 'transparent'} color={star <= review.rating ? '#facc15' : C.border} />
                        ))}
                      </div>
                      <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.5, margin: '0 0 16px 0' }}>{review.text}</p>
                      
                      {review.replied ? (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 8, borderLeft: `3px solid ${C.accent}` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent }}>Your Reply</span>
                            <CheckCircle size={12} color={C.accent} />
                          </div>
                          <p style={{ color: C.muted, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{review.replyText}</p>
                        </div>
                      ) : (
                        <div>
                          {replyingTo === review.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <textarea 
                                value={replyText}
                                onChange={e => setReplyText(e.target.value.slice(0, 1500))}
                                maxLength={1500}
                                placeholder="Write a public reply..."
                                style={{
                                  width: '100%',
                                  background: 'rgba(0,0,0,0.2)',
                                  border: `1px solid ${C.border}`,
                                  borderRadius: 8,
                                  padding: 12,
                                  color: '#fff',
                                  fontSize: 14,
                                  minHeight: 80,
                                  resize: 'vertical',
                                  outline: 'none'
                                }}
                              />
                              <div style={{ fontSize: 11, color: C.muted, textAlign: 'right', marginTop: -4 }}>
                                {replyText.length} / 1500 characters
                              </div>
                              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                  style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                                >
                                  Cancel
                                </button>
                                <button 
                                  onClick={() => submitReply(review.id)}
                                  disabled={submittingReply}
                                  style={{
                                    background: C.accent,
                                    color: '#fff',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: 6,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                  }}
                                >
                                  {submittingReply ? <Loader2 size={14} className="spin" /> : <Send size={14} />} 
                                  Post Reply
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setReplyingTo(review.id)}
                              style={{
                                background: 'transparent',
                                border: `1px solid ${C.border}`,
                                color: '#e2e8f0',
                                padding: '6px 16px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: C.muted, fontSize: 14 }}>
                    No reviews found for this client.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
    </div>
  );
}
