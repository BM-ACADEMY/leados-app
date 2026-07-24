import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { C } from '../../constants/theme.js';
import { useClient } from '../../contexts/ClientContext.jsx';
import {
  CheckCircle, Copy, Plus, Search, Filter, User, Clock,
  Sparkles, AlertTriangle, Check, Trash2, Shield, Zap,
  ExternalLink, ListOrdered, Camera, Briefcase, RefreshCw, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

// Default initial orders matching exact user screenshot
const INITIAL_ORDERS = [
  {
    id: 1,
    title: 'Fix Justdial listing — Namma Pondy Properties',
    priority: 'High',
    tag_category: 'Citation mismatch',
    assignee: 'Satish',
    client_name: 'Namma Pondy Properties',
    description: "Name mismatch between Justdial and Google. This tells Google your business info can't be trusted — rank drops.",
    box_type: 'steps',
    box_content: {
      steps: [
        'Go to justdial.com/business-owner-login',
        "Find 'Namma Pondy Realty' listing — Click Edit",
        'Change name to: Namma Pondy Properties',
        'Save and mark done'
      ]
    },
    status: 'open'
  },
  {
    id: 2,
    title: 'Upload 3 photos to GMB — BM Academy',
    priority: 'Medium',
    tag_category: 'Photo freshness',
    assignee: 'Babila',
    client_name: 'BM Academy',
    description: 'No new photos in 16 days. Google rewards active profiles with higher visibility.',
    box_type: 'photos',
    box_content: {
      photosNeeded: 'Office interior · Team photo · Class in session',
      captions: [
        "BM Academy — Pondicherry's #1 digital marketing training centre",
        'Expert faculty with 14+ years of industry experience',
        'Hands-on practical training — not just theory, real results'
      ]
    },
    status: 'open'
  },
  {
    id: 3,
    title: 'Add services list to GBP — BM TechX',
    priority: 'Low',
    tag_category: 'Profile completeness',
    assignee: 'Satish',
    client_name: 'BM TechX',
    description: 'GBP services list is empty. Competitors have 8-12 services. Missing = missing keyword matches.',
    box_type: 'services',
    box_content: {
      servicesText: 'Services to add (copy-paste into GBP → Edit → Services):',
      servicesList: [
        'Social Media Marketing',
        'Google Ads Management',
        'SEO Services',
        'Website Design & Development',
        'Branding & Logo Design',
        'Google Business Profile Management',
        'Meta Ads',
        'Content Creation'
      ]
    },
    status: 'open'
  }
];

export default function MafiyaOrders() {
  const [orders, setOrders] = useState(INITIAL_ORDERS);
  const [loading, setLoading] = useState(false);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, open, completed
  const [filterAssignee, setFilterAssignee] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { activeClient } = useClient();

  // Form state for creating new order
  const [newOrder, setNewOrder] = useState({
    title: '',
    client_name: activeClient ? activeClient.business_name || activeClient.client_name : '',
    priority: 'High',
    tag_category: 'Citation mismatch',
    assignee: 'Satish',
    description: '',
    box_type: 'steps',
    stepsText: '',
    photosNeeded: '',
    captionsText: '',
    servicesText: ''
  });

  const getAuthHeader = () => {
    const token = localStorage.getItem('leados_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/mafiya/orders`, { headers: getAuthHeader() });
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Parse box_content if it comes as string
        const parsed = res.data.map(o => ({
          ...o,
          box_content: typeof o.box_content === 'string' ? JSON.parse(o.box_content) : o.box_content
        }));
        setOrders(parsed);
      }
    } catch (e) {
      console.log('Using local order state (API fallback)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleToggleStatus = async (orderId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'open' : 'completed';

    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: nextStatus } : o));

    try {
      await axios.patch(`${API_URL}/api/mafiya/orders/${orderId}/status`, { status: nextStatus }, { headers: getAuthHeader() });
      toast.success(nextStatus === 'completed' ? 'Order marked as completed!' : 'Order reopened!');
    } catch (e) {
      console.log('Updated status locally');
    }
  };

  const handleAssigneeChange = async (orderId, newAssignee) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, assignee: newAssignee } : o));
    try {
      await axios.patch(`${API_URL}/api/mafiya/orders/${orderId}/assign`, { assignee: newAssignee }, { headers: getAuthHeader() });
      toast.success(`Assigned to ${newAssignee}`);
    } catch (e) {
      console.log('Assigned locally');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      await axios.delete(`${API_URL}/api/mafiya/orders/${orderId}`, { headers: getAuthHeader() });
      toast.success('Order deleted');
    } catch (e) {
      console.log('Deleted locally');
    }
  };

  const copyToClipboard = (text, label = 'Text') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newOrder.title.trim()) {
      toast.error('Please enter order title');
      return;
    }

    let box_content = {};
    if (newOrder.box_type === 'steps') {
      box_content = {
        steps: newOrder.stepsText.split('\n').filter(s => s.trim().length > 0)
      };
    } else if (newOrder.box_type === 'photos') {
      box_content = {
        photosNeeded: newOrder.photosNeeded,
        captions: newOrder.captionsText.split('\n').filter(c => c.trim().length > 0)
      };
    } else if (newOrder.box_type === 'services') {
      box_content = {
        servicesText: 'Services to add (copy-paste into GBP → Edit → Services):',
        servicesList: newOrder.servicesText.split('\n').filter(s => s.trim().length > 0)
      };
    }

    const payload = {
      title: newOrder.title,
      client_name: newOrder.client_name || 'General Client',
      priority: newOrder.priority,
      tag_category: newOrder.tag_category,
      assignee: newOrder.assignee,
      description: newOrder.description,
      box_type: newOrder.box_type,
      box_content
    };

    const tempId = Date.now();
    const createdObj = { id: tempId, ...payload, status: 'open' };
    setOrders(prev => [createdObj, ...prev]);
    setShowModal(false);
    toast.success('New Mafia Order created!');

    try {
      const res = await axios.post(`${API_URL}/api/mafiya/orders`, payload, { headers: getAuthHeader() });
      if (res.data && res.data.id) {
        setOrders(prev => prev.map(o => o.id === tempId ? { ...res.data, box_content } : o));
      }
    } catch (err) {
      console.log('Order created locally');
    }

    // Reset form
    setNewOrder({
      title: '',
      client_name: '',
      priority: 'High',
      tag_category: 'Citation mismatch',
      assignee: 'Satish',
      description: '',
      box_type: 'steps',
      stepsText: '',
      photosNeeded: '',
      captionsText: '',
      servicesText: ''
    });
  };

  // Filtered orders list
  const filteredOrders = orders.filter(o => {
    if (filterStatus === 'open' && o.status !== 'open') return false;
    if (filterStatus === 'completed' && o.status !== 'completed') return false;
    if (filterPriority !== 'ALL' && o.priority !== filterPriority) return false;
    if (filterAssignee !== 'ALL' && o.assignee !== filterAssignee) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = o.title.toLowerCase().includes(q);
      const matchClient = (o.client_name || '').toLowerCase().includes(q);
      const matchTag = (o.tag_category || '').toLowerCase().includes(q);
      const matchDesc = (o.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchClient && !matchTag && !matchDesc) return false;
    }
    return true;
  });

  const openCount = orders.filter(o => o.status === 'open').length;

  const numberBadgeColors = [
    { bg: '#881337', text: '#fda4af' }, // Pink / Crimson
    { bg: '#7c2d12', text: '#fdba74' }, // Orange / Amber
    { bg: '#1e3a8a', text: '#93c5fd' }, // Blue
    { bg: '#365314', text: '#bef264' }, // Green
    { bg: '#581c87', text: '#e9d5ff' }, // Purple
  ];

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      background: '#060c17',
      color: '#e2e8f0',
      padding: '24px 28px',
      fontFamily: "Inter, system-ui, -apple-system, sans-serif"
    }}>
      {/* Header Section */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              Mafia Orders
            </h1>
            <span style={{
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700
            }}>
              {openCount} Open
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => fetchOrders()}
              style={{
                background: '#0f172a',
                border: `1px solid ${C.border}`,
                color: C.muted,
                borderRadius: 8,
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600
              }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
            </button>

            <button
              onClick={() => setShowModal(true)}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 700,
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)'
              }}
            >
              <Plus size={16} /> Create Order
            </button>
          </div>
        </div>

        <p style={{
          fontSize: 13,
          color: '#64748b',
          margin: '6px 0 0 0',
          fontWeight: 500
        }}>
          AI-generated guided fixes · Each has exact steps · No guesswork
        </p>
      </div>

      {/* Filters Bar */}
      <div style={{
        background: '#0b1329',
        border: '1px solid #1e293b',
        borderRadius: 12,
        padding: '14px 18px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14
      }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: 240, flex: 1 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search orders, clients, steps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#060c17',
              border: '1px solid #1e293b',
              borderRadius: 8,
              padding: '8px 12px 8px 36px',
              color: '#e2e8f0',
              fontSize: 13,
              outline: 'none'
            }}
          />
        </div>

        {/* Status Tabs */}
        <div style={{ display: 'flex', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 3 }}>
          {['ALL', 'open', 'completed'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                background: filterStatus === st ? '#1e293b' : 'transparent',
                color: filterStatus === st ? '#f59e0b' : '#64748b',
                border: 'none',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {st === 'ALL' ? 'All Orders' : st}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Priority:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={{
              background: '#060c17',
              border: '1px solid #1e293b',
              borderRadius: 8,
              padding: '6px 12px',
              color: '#e2e8f0',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Priorities</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Assignee Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Assignee:</span>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            style={{
              background: '#060c17',
              border: '1px solid #1e293b',
              borderRadius: 8,
              padding: '6px 12px',
              color: '#e2e8f0',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Staff</option>
            <option value="Satish">Satish</option>
            <option value="Babila">Babila</option>
            <option value="Kamar">Kamar</option>
          </select>
        </div>
      </div>

      {/* Orders List / Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {filteredOrders.length === 0 ? (
          <div style={{
            background: '#0b1329',
            border: '1px dashed #1e293b',
            borderRadius: 14,
            padding: 48,
            textAlign: 'center',
            color: '#64748b'
          }}>
            <Shield size={36} style={{ marginBottom: 12, opacity: 0.5, color: '#f59e0b' }} />
            <h3 style={{ fontSize: 16, color: '#e2e8f0', margin: '0 0 6px 0' }}>No Mafia Orders found</h3>
            <p style={{ fontSize: 13, margin: 0 }}>Try clearing search filters or create a new Mafia Order.</p>
          </div>
        ) : (
          filteredOrders.map((order, idx) => {
            const badgeColor = numberBadgeColors[idx % numberBadgeColors.length];
            const isCompleted = order.status === 'completed';

            return (
              <div
                key={order.id}
                style={{
                  background: isCompleted ? 'rgba(15, 23, 42, 0.6)' : '#0b1329',
                  border: isCompleted ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid #1e293b',
                  borderRadius: 14,
                  padding: 24,
                  position: 'relative',
                  transition: 'border-color 0.2s, background 0.2s',
                  opacity: isCompleted ? 0.75 : 1
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                  {/* Number Badge */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: badgeColor.bg,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 800,
                    flexShrink: 0,
                    marginTop: 2
                  }}>
                    {idx + 1}
                  </div>

                  {/* Title & Tags */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <h2 style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: isCompleted ? '#94a3b8' : '#f8fafc',
                        margin: 0,
                        textDecoration: isCompleted ? 'line-through' : 'none'
                      }}>
                        {order.title}
                      </h2>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        title="Delete Order"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#475569',
                          cursor: 'pointer',
                          padding: 4,
                          borderRadius: 4
                        }}
                        onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.target.style.color = '#475569'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Tags Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {/* Priority Tag */}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background:
                          order.priority === 'High' ? 'rgba(239, 68, 68, 0.2)' :
                          order.priority === 'Medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color:
                          order.priority === 'High' ? '#f87171' :
                          order.priority === 'Medium' ? '#fbbf24' : '#60a5fa',
                        border:
                          order.priority === 'High' ? '1px solid rgba(239, 68, 68, 0.3)' :
                          order.priority === 'Medium' ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(59, 130, 246, 0.3)'
                      }}>
                        {order.priority}
                      </span>

                      {/* Category Outline Tag */}
                      {order.tag_category && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'transparent',
                          color: '#f97316',
                          border: '1px solid rgba(249, 115, 22, 0.4)'
                        }}>
                          {order.tag_category}
                        </span>
                      )}

                      {/* Assignee Badge */}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        background: '#1e293b',
                        color: '#94a3b8'
                      }}>
                        {order.assignee}
                      </span>

                      {/* Completed Pill if applicable */}
                      {isCompleted && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Check size={12} /> Done
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {order.description && (
                      <p style={{
                        fontSize: 13,
                        color: '#94a3b8',
                        margin: '10px 0 0 0',
                        lineHeight: '1.5'
                      }}>
                        {order.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Steps / Content Box */}
                <div style={{
                  background: '#060c17',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  padding: '16px 20px',
                  marginTop: 14,
                  marginBottom: 16
                }}>
                  {/* TYPE 1: STEPS */}
                  {order.box_type === 'steps' && order.box_content?.steps && (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {order.box_content.steps.map((step, sIdx) => {
                          // Check if step contains highlight text e.g., Namma Pondy Properties
                          const hasHighlight = step.includes('Namma Pondy Properties');
                          let stepText = step;
                          let highlightText = '';

                          if (hasHighlight) {
                            const parts = step.split('Namma Pondy Properties');
                            return (
                              <div key={sIdx} style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
                                {sIdx + 1}. {parts[0]}<strong style={{ color: '#f59e0b', fontWeight: 800 }}>Namma Pondy Properties</strong>{parts[1]}
                              </div>
                            );
                          }

                          return (
                            <div key={sIdx} style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                              {sIdx + 1}. {step}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => copyToClipboard(order.box_content.steps.join('\n'), 'Steps')}
                          style={{
                            background: 'transparent',
                            border: '1px solid #334155',
                            borderRadius: 6,
                            padding: '4px 10px',
                            color: '#94a3b8',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Copy size={12} /> Copy Steps
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TYPE 2: PHOTOS */}
                  {order.box_type === 'photos' && (
                    <div>
                      {order.box_content?.photosNeeded && (
                        <div style={{
                          fontSize: 13,
                          color: '#e2e8f0',
                          marginBottom: 12,
                          background: 'rgba(255,255,255,0.03)',
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                          <span style={{ color: '#94a3b8' }}>Photos needed: </span>
                          <span style={{ color: '#f8fafc', fontWeight: 600 }}>{order.box_content.photosNeeded}</span>
                        </div>
                      )}

                      {order.box_content?.captions && (
                        <div>
                          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                            Captions (copy-paste):
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 8 }}>
                            {order.box_content.captions.map((cap, cIdx) => (
                              <div key={cIdx} style={{ fontSize: 13, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>📷</span>
                                <span style={{ fontStyle: 'italic', color: '#e2e8f0' }}>"{cap}"</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => copyToClipboard((order.box_content?.captions || []).join('\n'), 'Captions')}
                          style={{
                            background: 'transparent',
                            border: '1px solid #334155',
                            borderRadius: 6,
                            padding: '4px 10px',
                            color: '#94a3b8',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Copy size={12} /> Copy Captions
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TYPE 3: SERVICES */}
                  {order.box_type === 'services' && (
                    <div>
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                        {order.box_content?.servicesText || 'Services to add (copy-paste into GBP → Edit → Services):'}
                      </div>
                      <div style={{
                        fontSize: 13,
                        color: '#cbd5e1',
                        lineHeight: 1.6,
                        background: 'rgba(255,255,255,0.02)',
                        padding: '10px 14px',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {(order.box_content?.servicesList || []).join(' · ')}
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => copyToClipboard((order.box_content?.servicesList || []).join(', '), 'Services list')}
                          style={{
                            background: 'transparent',
                            border: '1px solid #334155',
                            borderRadius: 6,
                            padding: '4px 10px',
                            color: '#94a3b8',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Copy size={12} /> Copy Services
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {/* Mark Done Button */}
                  <button
                    onClick={() => handleToggleStatus(order.id, order.status)}
                    style={{
                      background: isCompleted ? 'rgba(34, 197, 94, 0.2)' : '#f59e0b',
                      color: isCompleted ? '#4ade80' : '#000',
                      border: isCompleted ? '1px solid rgba(34, 197, 94, 0.4)' : 'none',
                      borderRadius: 7,
                      padding: '8px 18px',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s'
                    }}
                  >
                    <Check size={16} />
                    {isCompleted ? 'Completed' : 'Mark Done'}
                  </button>

                  {/* Assign Button / Select */}
                  <div style={{ position: 'relative' }}>
                    <select
                      value={order.assignee}
                      onChange={(e) => handleAssigneeChange(order.id, e.target.value)}
                      style={{
                        background: '#060c17',
                        border: '1px solid #334155',
                        color: '#cbd5e1',
                        borderRadius: 7,
                        padding: '8px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Satish">Assign to Satish</option>
                      <option value="Babila">Assign to Babila</option>
                      <option value="Kamar">Assign to Kamar</option>
                      <option value="Unassigned">Unassigned</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE ORDER MODAL */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20
        }}>
          <div style={{
            background: '#0b1329',
            border: '1px solid #1e293b',
            borderRadius: 16,
            width: '100%',
            maxWidth: 580,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 28,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={22} color="#f59e0b" />
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0 }}>Create Mafia Order</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Order Title</label>
                <input
                  type="text"
                  placeholder="e.g. Fix Justdial listing — Namma Pondy Properties"
                  value={newOrder.title}
                  onChange={(e) => setNewOrder({ ...newOrder, title: e.target.value })}
                  style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Client Name</label>
                  <input
                    type="text"
                    placeholder="e.g. BM Academy"
                    value={newOrder.client_name}
                    onChange={(e) => setNewOrder({ ...newOrder, client_name: e.target.value })}
                    style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Priority</label>
                  <select
                    value={newOrder.priority}
                    onChange={(e) => setNewOrder({ ...newOrder, priority: e.target.value })}
                    style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none' }}
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Tag Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Citation mismatch"
                    value={newOrder.tag_category}
                    onChange={(e) => setNewOrder({ ...newOrder, tag_category: e.target.value })}
                    style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Assignee</label>
                  <select
                    value={newOrder.assignee}
                    onChange={(e) => setNewOrder({ ...newOrder, assignee: e.target.value })}
                    style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none' }}
                  >
                    <option value="Satish">Satish</option>
                    <option value="Babila">Babila</option>
                    <option value="Kamar">Kamar</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Description / Issue Summary</label>
                <textarea
                  rows={2}
                  placeholder="Explain why this order is needed..."
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                  style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Guided Fix Type</label>
                <select
                  value={newOrder.box_type}
                  onChange={(e) => setNewOrder({ ...newOrder, box_type: e.target.value })}
                  style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none' }}
                >
                  <option value="steps">Numbered Steps List</option>
                  <option value="photos">Photo Freshness & Captions</option>
                  <option value="services">Services List Copy-Paste</option>
                </select>
              </div>

              {newOrder.box_type === 'steps' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Steps (One per line)</label>
                  <textarea
                    rows={4}
                    placeholder={`1. Go to website...\n2. Click edit...\n3. Update name...`}
                    value={newOrder.stepsText}
                    onChange={(e) => setNewOrder({ ...newOrder, stepsText: e.target.value })}
                    style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical' }}
                  />
                </div>
              )}

              {newOrder.box_type === 'photos' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Photos Needed</label>
                    <input
                      type="text"
                      placeholder="e.g. Office interior · Team photo · Class in session"
                      value={newOrder.photosNeeded}
                      onChange={(e) => setNewOrder({ ...newOrder, photosNeeded: e.target.value })}
                      style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Captions (One per line)</label>
                    <textarea
                      rows={3}
                      placeholder={`BM Academy — Pondicherry's #1 digital marketing training centre\nExpert faculty with 14+ years experience`}
                      value={newOrder.captionsText}
                      onChange={(e) => setNewOrder({ ...newOrder, captionsText: e.target.value })}
                      style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical' }}
                    />
                  </div>
                </>
              )}

              {newOrder.box_type === 'services' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Services List (One per line)</label>
                  <textarea
                    rows={4}
                    placeholder={`Social Media Marketing\nGoogle Ads Management\nSEO Services`}
                    value={newOrder.servicesText}
                    onChange={(e) => setNewOrder({ ...newOrder, servicesText: e.target.value })}
                    style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', color: '#000', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                >
                  Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
