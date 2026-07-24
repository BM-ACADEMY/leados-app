import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { C } from '../../constants/theme.js';
import {
  CheckCircle, Copy, Plus, Search, Filter, User, Clock,
  Sparkles, AlertTriangle, Check, Trash2, Shield, Zap,
  ExternalLink, ListOrdered, Camera, Briefcase, RefreshCw, X,
  Globe, Calendar, Volume2, Tag, BookOpen, AlertCircle, Info, Link
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function MafiyaOrders() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [loadingClients, setLoadingClients] = useState(true);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [citationResults, setCitationResults] = useState([]);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [brainEntries, setBrainEntries] = useState([]);
  const [loadingBrain, setLoadingBrain] = useState(false);

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'citation_audit', 'gmb_planner'
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, open, completed
  const [filterAssignee, setFilterAssignee] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [syncingGmbPosts, setSyncingGmbPosts] = useState(false);
  const [suggestedPosts, setSuggestedPosts] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [plannerSubTab, setPlannerSubTab] = useState('brain_posts'); // 'brain_posts', 'ai_suggestions'
  const [completedPosts, setCompletedPosts] = useState({}); // { [postId]: boolean }
  const [selectedMonth, setSelectedMonth] = useState('Month 1'); // 'Month 1', 'Month 2'

  // Form state for creating new order
  const [newOrder, setNewOrder] = useState({
    title: '',
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

  // Fetch GMB clients
  const fetchClients = async () => {
    setLoadingClients(true);
    try {
      const res = await axios.get(`${API_URL}/api/mafiya/clients`, { headers: getAuthHeader() });
      setClients(res.data);
      if (res.data.length > 0) {
        const saved = localStorage.getItem('activeGmbClient');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const found = res.data.find(c => c.id === parsed.id);
            if (found) {
              setActiveClient(found);
              return;
            }
          } catch (e) {}
        }
        setActiveClient(res.data[0]);
      }
    } catch (err) {
      console.error('Fetch clients error:', err);
      toast.error('Failed to load businesses');
    } finally {
      setLoadingClients(false);
    }
  };

  // Fetch orders from DB
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await axios.get(`${API_URL}/api/mafiya/orders`, { headers: getAuthHeader() });
      if (res.data && Array.isArray(res.data)) {
        const parsed = res.data.map(o => ({
          ...o,
          box_content: typeof o.box_content === 'string' ? JSON.parse(o.box_content) : o.box_content
        }));
        setOrders(parsed);
      }
    } catch (e) {
      console.log('Using local order state (API fallback)');
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch citation scan results
  const fetchCitations = async (clientId) => {
    if (!clientId) return;
    setLoadingCitations(true);
    setCitationResults([]);
    try {
      const res = await axios.get(`${API_URL}/api/citations/${clientId}`, { headers: getAuthHeader() });
      if (res.data && res.data.results) {
        setCitationResults(res.data.results);
      }
    } catch (err) {
      console.log('Failed to fetch citations');
    } finally {
      setLoadingCitations(false);
    }
  };

  // Fetch GMB Brain config
  const fetchBrain = async (clientId) => {
    if (!clientId) return;
    setLoadingBrain(true);
    setBrainEntries([]);
    try {
      const res = await axios.get(`${API_URL}/api/mafiya/reviews/brain?clientId=${clientId}`, { headers: getAuthHeader() });
      if (res.data) {
        setBrainEntries(res.data);
      }
    } catch (err) {
      console.log('Failed to fetch brain entries');
    } finally {
      setLoadingBrain(false);
    }
  };

  // Fetch suggested GMB posts dynamically from Gemini using GMB Brain
  const fetchSuggestedPosts = async (clientId) => {
    if (!clientId) return;
    setLoadingSuggestions(true);
    setSuggestedPosts([]);
    try {
      const res = await axios.post(`${API_URL}/api/mafiya/reviews/brain/suggest-posts`, { clientId }, { headers: getAuthHeader() });
      if (res.data && Array.isArray(res.data)) {
        setSuggestedPosts(res.data);
      }
    } catch (err) {
      console.log('Gemini suggested GMB posts generation unavailable. Fallback to templates.');
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchOrders();
  }, []);

  useEffect(() => {
    if (activeClient) {
      localStorage.setItem('activeGmbClient', JSON.stringify(activeClient));
      fetchCitations(activeClient.id);
      fetchBrain(activeClient.id);
      fetchSuggestedPosts(activeClient.id);
    }
  }, [activeClient]);

  // Sync / Import GMB Posts from Google Profile
  const handleSyncGmbPosts = async () => {
    if (!activeClient) return;
    setSyncingGmbPosts(true);
    try {
      const res = await axios.post(`${API_URL}/api/mafiya/reviews/posts/import`, { clientId: activeClient.id }, { headers: getAuthHeader() });
      toast.success(res.data.message || 'Posts imported successfully!');
      fetchOrders();
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync live posts from Google Business Profile.');
    } finally {
      setSyncingGmbPosts(false);
    }
  };

  const handleToggleStatus = async (orderId, currentStatus) => {
    const nextStatus = currentStatus === 'completed' ? 'open' : 'completed';
    const dynamicOrder = allFilteredAndDynamicOrders.find(o => o.id === orderId && o.isDynamic);

    if (dynamicOrder) {
      try {
        const payload = {
          title: dynamicOrder.title,
          client_name: dynamicOrder.client_name,
          priority: dynamicOrder.priority,
          tag_category: dynamicOrder.tag_category,
          assignee: dynamicOrder.assignee,
          description: dynamicOrder.description,
          box_type: dynamicOrder.box_type,
          box_content: dynamicOrder.box_content
        };
        const res = await axios.post(`${API_URL}/api/mafiya/orders`, payload, { headers: getAuthHeader() });
        if (res.data && res.data.id) {
          await axios.patch(`${API_URL}/api/mafiya/orders/${res.data.id}/status`, { status: nextStatus }, { headers: getAuthHeader() });
          toast.success('Citation task fixed & logged!');
          fetchOrders();
        }
      } catch (err) {
        toast.error('Failed to log citation task');
      }
      return;
    }

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
    const dynamicOrder = allFilteredAndDynamicOrders.find(o => o.id === orderId && o.isDynamic);
    if (dynamicOrder) {
      toast.error('Create the order first to assign staff');
      return;
    }

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
    if (e) e.preventDefault();
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
      client_name: activeClient ? activeClient.business_name || activeClient.display_name : 'General Client',
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

  const getDirectoryGuidance = (directoryName = '') => {
    const nameLower = directoryName.toLowerCase();
    if (nameLower.includes('justdial')) {
      return [
        'Go to justdial.com/business-owner-login',
        'Find directory listing & click Edit',
        `Update Name, Phone & Address to match GMB Master NAP exactly`,
        'Save listing and check live link status'
      ];
    }
    if (nameLower.includes('facebook')) {
      return [
        'Open your Facebook Business Page',
        'Go to Page Info → About section',
        'Update Name, Address & Contact number',
        'Save and mark done'
      ];
    }
    if (nameLower.includes('sulekha')) {
      return [
        'Open sulekha.com business partner panel',
        'Edit business profile info',
        'Verify master information details are consistent',
        'Save the changes'
      ];
    }
    return [
      `Open your ${directoryName || 'directory'} listing profile`,
      'Claim the listing or log in to owner account',
      'Correct matching fields (Business Name, Phone, Address)',
      'Confirm update is published'
    ];
  };

  const getDynamicCitationOrders = () => {
    if (!activeClient) return [];
    const clientName = activeClient.business_name || activeClient.display_name;

    const dynamicOrders = [];
    citationResults.forEach((res, idx) => {
      const isMismatch = res.status === 'Mismatch' || res.type === 'Mismatch';
      const isMissing = res.status === 'Missing Listing' || res.type === 'Missing Listing' || res.status === 'Missing';

      if (isMismatch) {
        const exists = orders.some(o => o.title.toLowerCase().includes(res.directory.toLowerCase()) && (o.client_name || '').toLowerCase() === clientName.toLowerCase());
        if (!exists) {
          dynamicOrders.push({
            id: `dyn-mismatch-${idx}`,
            isDynamic: true,
            title: `Fix ${res.directory} listing — ${clientName}`,
            priority: 'High',
            tag_category: 'Citation mismatch',
            assignee: 'Satish',
            client_name: clientName,
            description: `Auto-detected NAP mismatch between GMB and ${res.directory}. Master NAP: ${activeClient.business_address || 'Pondicherry'}, directory value: ${res.address || 'Mismatch'}.`,
            box_type: 'steps',
            box_content: {
              steps: getDirectoryGuidance(res.directory)
            },
            status: 'open'
          });
        }
      } else if (isMissing) {
        const exists = orders.some(o => o.title.toLowerCase().includes(res.directory.toLowerCase()) && (o.client_name || '').toLowerCase() === clientName.toLowerCase());
        if (!exists) {
          dynamicOrders.push({
            id: `dyn-missing-${idx}`,
            isDynamic: true,
            title: `Create ${res.directory} citation listing — ${clientName}`,
            priority: 'Medium',
            tag_category: 'Missing Citation',
            assignee: 'Satish',
            client_name: clientName,
            description: `Auto-detected missing citation profile on ${res.directory}. Create profile to improve local SEO trust score.`,
            box_type: 'steps',
            box_content: {
              steps: [
                `Go to ${res.directory.toLowerCase()}.com business onboarding portal`,
                'Fill in correct GMB Master NAP details',
                'Verify via mobile OTP / Email link',
                'Add live citation link into scanner log'
              ]
            },
            status: 'open'
          });
        }
      }
    });

    return dynamicOrders;
  };

  const clientName = activeClient ? activeClient.business_name || activeClient.display_name : '';
  const dbClientOrders = orders.filter(o => (o.client_name || '').toLowerCase() === clientName.toLowerCase());
  const allFilteredAndDynamicOrders = [...dbClientOrders, ...getDynamicCitationOrders()].filter(o => {
    if (filterStatus === 'open' && o.status !== 'open') return false;
    if (filterStatus === 'completed' && o.status !== 'completed') return false;
    if (filterPriority !== 'ALL' && o.priority !== filterPriority) return false;
    if (filterAssignee !== 'ALL' && o.assignee !== filterAssignee) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = o.title.toLowerCase().includes(q);
      const matchTag = (o.tag_category || '').toLowerCase().includes(q);
      const matchDesc = (o.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchTag && !matchDesc) return false;
    }
    return true;
  });

  const openCount = allFilteredAndDynamicOrders.filter(o => o.status === 'open').length;

  // Post frequency and content details based on category
  const getPostingStrategy = () => {
    if (!activeClient) return { freq: '2 Posts / Week', reason: 'General optimization frequency' };
    const category = (activeClient.business_category || activeClient.custom_category || '').toLowerCase();
    
    if (category.includes('academy') || category.includes('education') || category.includes('school') || category.includes('training')) {
      return {
        freq: '3 Posts / Week',
        reason: 'Education profiles benefit from high visual updates (student proof, batch highlights, expert tips).',
        trendingThemes: ['Batch Student Testimonials', 'Weekly Study Tips', 'Course Enrollment Offers']
      };
    }
    if (category.includes('tech') || category.includes('software') || category.includes('digital') || category.includes('agency')) {
      return {
        freq: '4 Posts / Week',
        reason: 'Highly competitive local tech space. Demands consistent keyword coverage and case studies.',
        trendingThemes: ['Recent Client Case Studies', 'Tech Stack Tips', 'Google Ads/SEO updates']
      };
    }
    return {
      freq: '2 Posts / Week',
      reason: 'Standard local visibility optimization cycle.',
      trendingThemes: ['Customer FAQs', 'Business Highlights', 'Discount Offers']
    };
  };

  const getBrainContentSuggestions = () => {
    if (!activeClient || brainEntries.length === 0) return [];

    const name = activeClient.display_name || activeClient.business_name;
    const phone = activeClient.phone_number || '';
    const suggestions = [];

    // Find Tone entry
    let toneVoice = 'Friendly';
    const toneEntry = brainEntries.find(e => e.entry_type === 'tone');
    if (toneEntry) {
      try {
        const parsed = JSON.parse(toneEntry.content);
        toneVoice = parsed.voice || 'Friendly';
      } catch (e) {}
    }

    // Find Keywords
    let keywords = [];
    const kwEntry = brainEntries.find(e => e.entry_type === 'keyword');
    if (kwEntry) {
      try {
        keywords = JSON.parse(kwEntry.content);
      } catch (e) {}
    }
    const hashtags = keywords.map(k => `#${k.replace(/\s+/g, '')}`).join(' ');

    const monthPrefix = selectedMonth === 'Month 2' ? 'Month 2 Campaign: ' : '';

    // 1. Process Offers from Brain
    const offerEntry = brainEntries.find(e => e.entry_type === 'offer');
    if (offerEntry) {
      try {
        const parsedOffers = JSON.parse(offerEntry.content);
        if (Array.isArray(parsedOffers)) {
          parsedOffers.forEach((off, idx) => {
            if (off.title || off.description) {
              suggestions.push({
                week: `Offer Post #${idx + 1}`,
                title: `${monthPrefix}${off.title || 'Special Promotion'}`,
                type: 'Offer Post',
                caption: `${off.title ? `🔥 ${off.title}: ` : ''}${off.description || ''}${off.validUntil ? ` (Valid until: ${off.validUntil})` : ''} Call us at ${phone} to redeem. ${off.cta ? `CTA: ${off.cta}` : ''} \n\n${hashtags}`,
                visual: `Promo banner highlighting "${off.title || 'Discount'}" with branding.`,
                tone: `${toneVoice} voice alignment`,
                hashtags
              });
            }
          });
        }
      } catch (e) {}
    }

    // 2. Process Seasonal Occasions from Brain
    const seasonalEntry = brainEntries.find(e => e.entry_type === 'seasonal');
    if (seasonalEntry) {
      try {
        const parsedSeasonal = JSON.parse(seasonalEntry.content);
        if (Array.isArray(parsedSeasonal)) {
          parsedSeasonal.forEach((seas, idx) => {
            if (seas.occasion || seas.instructions) {
              suggestions.push({
                week: `Seasonal Post #${idx + 1}`,
                title: `${monthPrefix}${seas.occasion || 'Holiday Theme'}`,
                type: 'Seasonal Post',
                caption: `🎉 Celebrating ${seas.occasion || 'Special Season'}! ${seas.instructions || ''} Get in touch with ${name} at ${phone}. \n\n${hashtags}`,
                visual: `Event banner for ${seas.occasion || 'holiday season'} with brand logo overlay.`,
                tone: `${toneVoice} voice alignment`,
                hashtags
              });
            }
          });
        }
      } catch (e) {}
    }

    // 3. Process Q&A Bank from Brain
    const qaEntry = brainEntries.find(e => e.entry_type === 'qa');
    if (qaEntry) {
      try {
        const parsedQa = JSON.parse(qaEntry.content);
        if (Array.isArray(parsedQa)) {
          parsedQa.forEach((item, idx) => {
            if (item.question || item.answer) {
              suggestions.push({
                week: `Q&A Post #${idx + 1}`,
                title: `${monthPrefix}${item.question ? `Q: ${item.question.slice(0, 30)}...` : 'FAQ Feature'}`,
                type: 'Educational Post',
                caption: `💡 FAQ Highlight:\nQuestion: "${item.question || ''}"\nAnswer: "${item.answer || ''}"\nLearn more at ${name}!`,
                visual: 'Question mark icon graphic with answer text card layout.',
                tone: `${toneVoice} voice alignment`,
                hashtags
              });
            }
          });
        }
      } catch (e) {}
    }

    // 4. Default Keyword Post if suggestion list is empty
    if (suggestions.length === 0 && keywords.length > 0) {
      suggestions.push({
        week: 'Keyword Post',
        title: `${monthPrefix}Learn more about our services`,
        type: 'Educational Post',
        caption: `Discover top tier services in Pondicherry at ${name}. We specialize in ${keywords.join(', ')} to bring you the best results. Contact us at ${phone}! \n\n${hashtags}`,
        visual: 'Infographic explaining the benefits of choosing local certified experts.',
        tone: `${toneVoice} voice alignment`,
        hashtags
      });
    }

    return suggestions;
  };

  const handleCreatePostOrderAndNavigate = (sugg) => {
    // 1. Mark as completed in checkbox state
    setCompletedPosts(prev => ({
      ...prev,
      [`${selectedMonth}-${sugg.week}`]: true
    }));
    toast.success('GMB task marked completed! Redirecting to Street Posts...');
    // 2. Navigate to Street Posts with state payload
    navigate('/mafiya/street-posts', {
      state: {
        caption: sugg.caption,
        title: sugg.title
      }
    });
  };

  const handleAddSuggestedPostAsOrder = async (sugg) => {
    const payload = {
      title: `Schedule Post: ${sugg.title} — ${clientName}`,
      client_name: clientName,
      priority: 'Medium',
      tag_category: 'GMB Post Planning',
      assignee: 'Babila',
      description: `Create and schedule GMB post using recommendations from GMB Brain configuration. Visual concept: ${sugg.visual}`,
      box_type: 'photos',
      box_content: {
        photosNeeded: sugg.visual,
        captions: [sugg.caption]
      }
    };

    try {
      const res = await axios.post(`${API_URL}/api/mafiya/orders`, payload, { headers: getAuthHeader() });
      if (res.data && res.data.id) {
        toast.success(`Suggested post added to Mafia Orders!`);
        fetchOrders();
      }
    } catch (err) {
      toast.error('Failed to save suggestion');
    }
  };

  const numberBadgeColors = [
    { bg: '#881337', text: '#fda4af' },
    { bg: '#7c2d12', text: '#fdba74' },
    { bg: '#1e3a8a', text: '#93c5fd' },
    { bg: '#365314', text: '#bef264' }
  ];

  const strategy = getPostingStrategy();

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
              {openCount} Open Tasks
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* GMB Profile Selector Dropdown */}
            <select
              value={activeClient ? activeClient.id : ''}
              onChange={(e) => {
                const c = clients.find(cl => cl.id === parseInt(e.target.value));
                if (c) setActiveClient(c);
              }}
              style={{
                background: '#0b1329',
                border: `1px solid #1e293b`,
                borderRadius: 8,
                color: '#fff',
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                minWidth: 200
              }}
            >
              {loadingClients ? (
                <option>Loading businesses...</option>
              ) : (
                clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.display_name || c.business_name}</option>
                ))
              )}
            </select>

            <button
              onClick={() => {
                fetchOrders();
                if (activeClient) {
                  fetchCitations(activeClient.id);
                  fetchBrain(activeClient.id);
                }
              }}
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
              <RefreshCw size={14} className={loadingOrders || loadingCitations ? 'spin' : ''} /> Refresh
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
          AI-generated guided fixes & GMB Brain content suggestions · Each has exact steps · No guesswork
        </p>
      </div>

      {/* Main Tabs switcher */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #1e293b', marginBottom: 20, paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'orders' ? '#f59e0b' : '#64748b',
            borderBottom: activeTab === 'orders' ? '2px solid #f59e0b' : 'none',
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <ListOrdered size={16} /> Citation Audit Matches
        </button>

        <button
          onClick={() => setActiveTab('citation_audit')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'citation_audit' ? '#f59e0b' : '#64748b',
            borderBottom: activeTab === 'citation_audit' ? '2px solid #f59e0b' : 'none',
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Globe size={16} /> Live Directory Status Scan
        </button>

        <button
          onClick={() => setActiveTab('gmb_planner')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'gmb_planner' ? '#f59e0b' : '#64748b',
            borderBottom: activeTab === 'gmb_planner' ? '2px solid #f59e0b' : 'none',
            padding: '8px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <BookOpen size={16} /> Week-by-Week GMB Post Planner
        </button>
      </div>

      {activeTab === 'orders' && (
        <>
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
          </div>

          {/* Orders Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {allFilteredAndDynamicOrders.length === 0 ? (
              <div style={{
                background: '#0b1329',
                border: '1px dashed #1e293b',
                borderRadius: 14,
                padding: 48,
                textAlign: 'center',
                color: '#64748b'
              }}>
                <Shield size={36} style={{ marginBottom: 12, opacity: 0.5, color: '#f59e0b' }} />
                <h3 style={{ fontSize: 16, color: '#e2e8f0', margin: '0 0 6px 0' }}>No active Mafia Orders found</h3>
                <p style={{ fontSize: 13, margin: 0 }}>Try clearing filters, selecting another GMB profile, or running citation scan.</p>
              </div>
            ) : (
              allFilteredAndDynamicOrders.map((order, idx) => {
                const badgeColor = numberBadgeColors[idx % numberBadgeColors.length] || { bg: '#1e3a8a', text: '#fff' };
                const isCompleted = order.status === 'completed';

                return (
                  <div
                    key={order.id}
                    style={{
                      background: isCompleted ? 'rgba(15, 23, 42, 0.6)' : '#0b1329',
                      border: isCompleted ? '1px solid rgba(34, 197, 94, 0.2)' : order.isDynamic ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #1e293b',
                      borderRadius: 14,
                      padding: 24,
                      position: 'relative',
                      transition: 'border-color 0.2s, background 0.2s',
                      opacity: isCompleted ? 0.75 : 1
                    }}
                  >
                    {/* Dynamic Diagnostic Order Indicator */}
                    {order.isDynamic && (
                      <span style={{
                        position: 'absolute',
                        top: 14,
                        right: 48,
                        background: 'rgba(245, 158, 11, 0.15)',
                        color: '#f59e0b',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 10,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <AlertCircle size={10} /> Live Recommendation
                      </span>
                    )}

                    {/* Header Row */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
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

                          {!order.isDynamic && (
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
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>

                        {/* Tags Row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
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

                    {/* Step details content box */}
                    <div style={{
                      background: '#060c17',
                      border: '1px solid #1e293b',
                      borderRadius: 10,
                      padding: '16px 20px',
                      marginTop: 14,
                      marginBottom: 16
                    }}>
                      {order.box_type === 'steps' && order.box_content?.steps && (
                        <div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {order.box_content.steps.map((step, sIdx) => (
                              <div key={sIdx} style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
                                {sIdx + 1}. {step}
                              </div>
                            ))}
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
                              <span style={{ color: '#94a3b8' }}>Visual Idea: </span>
                              <span style={{ color: '#f8fafc', fontWeight: 600 }}>{order.box_content.photosNeeded}</span>
                            </div>
                          )}
                          {order.box_content?.captions && (
                            <div>
                              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                                Captions Copy:
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

                      {order.box_type === 'services' && (
                        <div>
                          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                            {order.box_content?.servicesText || 'Services List:'}
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

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
                          gap: 6
                        }}
                      >
                        <Check size={16} />
                        {isCompleted ? 'Completed' : order.isDynamic ? 'Log Fix & Complete' : 'Mark Done'}
                      </button>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Citation Audit View */}
      {activeTab === 'citation_audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ background: '#0b1329', padding: 20, borderRadius: 12, border: '1px solid #1e293b' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Globe size={18} color="#f59e0b" /> Citation Audit Sync & Diagnostic Details
            </h3>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 6, marginBottom: 0 }}>
              Live audit comparison of business NAP across directories. Click <strong>"Verify / Complete"</strong> in the main tab to record corrections.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {citationResults.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
                No active citation audit logs found. Run a check in the Citations scanner view first.
              </div>
            ) : (
              citationResults.map((cit, cIdx) => {
                const isMatch = cit.status === 'Match' || cit.type === 'Match';
                const isMismatch = cit.status === 'Mismatch' || cit.type === 'Mismatch';

                return (
                  <div
                    key={cIdx}
                    style={{
                      background: '#0b1329',
                      border: `1px solid ${isMatch ? 'rgba(34, 197, 94, 0.2)' : isMismatch ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                      padding: 16,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>{cit.directory}</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: isMatch ? 'rgba(34, 197, 94, 0.15)' : isMismatch ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isMatch ? '#4ade80' : isMismatch ? '#f87171' : '#fbbf24'
                        }}>
                          {cit.status || cit.type || 'Missing'}
                        </span>
                      </div>
                      <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
                        {isMatch ? 'Consistent Master NAP verification.' : isMismatch ? `Incorrect: ${cit.address || 'Field details mismatched'}` : 'Listing does not exist on this directory.'}
                      </p>
                    </div>

                    {cit.url && (
                      <a
                        href={cit.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: '#1e293b',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        <Link size={12} /> Visit Listing <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Week by Week Planner View */}
      {activeTab === 'gmb_planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Recommended Frequency Section */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(6, 182, 212, 0.08) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start'
          }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: 10, borderRadius: 12, color: '#f59e0b' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>Recommended Posting frequency: {strategy.freq}</h4>
                <button
                  onClick={handleSyncGmbPosts}
                  disabled={syncingGmbPosts}
                  style={{
                    background: '#0f172a',
                    border: '1px solid #f59e0b',
                    color: '#f59e0b',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <RefreshCw size={12} className={syncingGmbPosts ? 'spin' : ''} />
                  {syncingGmbPosts ? 'Checking GMB...' : 'Verify & Sync GMB Posts'}
                </button>
                <button
                  onClick={() => fetchSuggestedPosts(activeClient.id)}
                  disabled={loadingSuggestions}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#000',
                    border: 'none',
                    borderRadius: 6,
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <Sparkles size={12} className={loadingSuggestions ? 'spin' : ''} />
                  {loadingSuggestions ? 'Regenerating...' : 'AI Regenerate Suggestions'}
                </button>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#a1a1aa', lineHeight: 1.5 }}>
                {strategy.reason}
              </p>
              {strategy.trendingThemes && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Trending Themes:</span>
                  {strategy.trendingThemes.map((theme, tIdx) => (
                    <span key={tIdx} style={{ fontSize: 11, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                      #{theme}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Month Selector & Posting Goal Info */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
            background: 'rgba(15, 23, 42, 0.4)',
            border: '1px solid #1e293b',
            padding: '12px 20px',
            borderRadius: 12
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Active Campaign Schedule:</span>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  fetchSuggestedPosts(activeClient.id, e.target.value);
                }}
                style={{
                  background: '#0b1329',
                  border: '1px solid #334155',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="Month 1">Month 1 (Current Month)</option>
                <option value="Month 2">Month 2 (Upcoming Month)</option>
              </select>
            </div>
            
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
              Monthly Target Goal: <span style={{ color: '#f59e0b', fontWeight: 800 }}>{strategy.freq}</span> ({parseInt(strategy.freq) * 4} Posts Total)
            </div>
          </div>

          {/* Sub Tabs Selection Bar */}
          <div style={{
            display: 'flex',
            gap: 8,
            background: '#0b1329',
            border: '1px solid #1e293b',
            borderRadius: 8,
            padding: 4,
            width: 'fit-content'
          }}>
            <button
              onClick={() => setPlannerSubTab('brain_posts')}
              style={{
                background: plannerSubTab === 'brain_posts' ? '#f59e0b' : 'transparent',
                color: plannerSubTab === 'brain_posts' ? '#000' : '#64748b',
                border: 'none',
                borderRadius: 6,
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Don's Brain Posts
            </button>
            <button
              onClick={() => setPlannerSubTab('ai_suggestions')}
              style={{
                background: plannerSubTab === 'ai_suggestions' ? '#f59e0b' : 'transparent',
                color: plannerSubTab === 'ai_suggestions' ? '#000' : '#64748b',
                border: 'none',
                borderRadius: 6,
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              AI Suggestions
            </button>
          </div>

          {/* Month Completion Congrats Banner */}
          {(() => {
            const currentSuffs = plannerSubTab === 'brain_posts' ? getBrainContentSuggestions() : suggestedPosts;
            const completedAll = currentSuffs.length > 0 && currentSuffs.every(s => completedPosts[`${selectedMonth}-${s.week}`]);
            if (!completedAll) return null;

            return (
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 14,
                padding: 24,
                textAlign: 'center',
                boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                animation: 'pulse 2s infinite'
              }}>
                <CheckCircle size={44} color="#22c55e" style={{ margin: '0 auto 12px auto', display: 'block' }} />
                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  🎉 All {selectedMonth} Posts Successfully Completed!
                </h3>
                <p style={{ margin: '0 0 16px 0', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                  {selectedMonth === 'Month 1' 
                    ? "Great job! You have fully scheduled all required posts for Month 1. Let's start preparing the content strategy for Month 2!"
                    : "Excellent effort! All campaigns for Month 2 are successfully locked in. Keep maintaining this consistency to boost GMB Local SEO rank!"}
                </p>
                {selectedMonth === 'Month 1' && (
                  <button
                    onClick={() => {
                      setSelectedMonth('Month 2');
                      fetchSuggestedPosts(activeClient.id, 'Month 2');
                    }}
                    style={{
                      background: '#22c55e',
                      color: '#000',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 20px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                    }}
                  >
                    Configure & View Month 2 Content Plan
                  </button>
                )}
              </div>
            );
          })()}

          {plannerSubTab === 'brain_posts' ? (
            getBrainContentSuggestions().map((sugg, idx) => {
              const isDone = !!completedPosts[`${selectedMonth}-${sugg.week}`];
              return (
                <div
                  key={idx}
                  style={{
                    background: '#0b1329',
                    border: isDone ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid #1e293b',
                    borderRadius: 14,
                    padding: 24,
                    marginBottom: 16,
                    opacity: isDone ? 0.65 : 1,
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => {
                          setCompletedPosts(prev => ({
                            ...prev,
                            [`${selectedMonth}-${sugg.week}`]: e.target.checked
                          }));
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: '#22c55e',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{
                        background: isDone ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isDone ? '#4ade80' : '#f59e0b',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: isDone ? 'line-through' : 'none'
                      }}>
                        {sugg.week}
                      </span>
                      <h3 style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 700,
                        color: isDone ? '#64748b' : '#fff',
                        textDecoration: isDone ? 'line-through' : 'none'
                      }}>
                        {sugg.title}
                      </h3>
                    </div>

                    <span style={{
                      fontSize: 12,
                      color: isDone ? '#475569' : '#06b6d4',
                      background: isDone ? 'rgba(71, 85, 105, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontWeight: 600
                    }}>
                      {isDone ? 'Completed ✓' : sugg.type}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
                    <div style={{ background: '#060c17', padding: 14, borderRadius: 10, border: '1px solid #1e293b', opacity: isDone ? 0.5 : 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700 }}>VISUAL IDEA CONCEPT</span>
                      <span style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, textDecoration: isDone ? 'line-through' : 'none' }}>{sugg.visual}</span>
                    </div>

                    <div style={{ background: '#060c17', padding: 14, borderRadius: 10, border: '1px solid #1e293b', opacity: isDone ? 0.5 : 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700 }}>AI VOICE COMPLIANCE</span>
                      <span style={{ fontSize: 13, color: '#c084fc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Volume2 size={14} /> Brand Tone: {sugg.tone}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#060c17', border: '1px solid #1e293b', borderRadius: 10, padding: 16, position: 'relative', opacity: isDone ? 0.5 : 1 }}>
                    <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 700 }}>RECOMMENDED CAPTION COPY</span>
                    <p style={{
                      fontSize: 13,
                      color: '#e2e8f0',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      fontStyle: 'italic',
                      textDecoration: isDone ? 'line-through' : 'none'
                    }}>
                      "{sugg.caption}"
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 14 }}>
                    <button
                      onClick={() => copyToClipboard(sugg.caption, 'Post Caption')}
                      style={{
                        background: 'transparent',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '8px 14px',
                        color: '#94a3b8',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Copy size={14} /> Copy Caption
                    </button>

                    <button
                      onClick={() => handleCreatePostOrderAndNavigate(sugg)}
                      style={{
                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)'
                      }}
                    >
                      <Plus size={14} /> Create GMB Post Order
                    </button>
                  </div>
                </div>
              );
            })
          ) : loadingSuggestions ? (
            <div style={{
              background: '#0b1329',
              border: '1px dashed #1e293b',
              borderRadius: 14,
              padding: 48,
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Sparkles size={36} style={{ marginBottom: 12, color: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
              <h3 style={{ fontSize: 16, color: '#e2e8f0', margin: '0 0 6px 0' }}>Generating AI Content Planner Suggestions</h3>
              <p style={{ fontSize: 13, margin: 0 }}>Gemini is currently writing 4-weeks of GMB Post suggestions customized for your GMB Brain tone, keywords, and active offers...</p>
            </div>
          ) : (
            (suggestedPosts.length > 0 ? suggestedPosts : []).map((sugg, idx) => {
              const isDone = !!completedPosts[`${selectedMonth}-${sugg.week}`];
              return (
                <div
                  key={idx}
                  style={{
                    background: '#0b1329',
                    border: isDone ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid #1e293b',
                    borderRadius: 14,
                    padding: 24,
                    marginBottom: 16,
                    opacity: isDone ? 0.65 : 1,
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={(e) => {
                          setCompletedPosts(prev => ({
                            ...prev,
                            [`${selectedMonth}-${sugg.week}`]: e.target.checked
                          }));
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          accentColor: '#22c55e',
                          cursor: 'pointer'
                        }}
                      />
                      <span style={{
                        background: isDone ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isDone ? '#4ade80' : '#f59e0b',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 800,
                        textDecoration: isDone ? 'line-through' : 'none'
                      }}>
                        {sugg.week}
                      </span>
                      <h3 style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 700,
                        color: isDone ? '#64748b' : '#fff',
                        textDecoration: isDone ? 'line-through' : 'none'
                      }}>
                        {sugg.title}
                      </h3>
                    </div>

                    <span style={{
                      fontSize: 12,
                      color: isDone ? '#475569' : '#06b6d4',
                      background: isDone ? 'rgba(71, 85, 105, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontWeight: 600
                    }}>
                      {isDone ? 'Completed ✓' : sugg.type}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
                    <div style={{ background: '#060c17', padding: 14, borderRadius: 10, border: '1px solid #1e293b', opacity: isDone ? 0.5 : 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700 }}>VISUAL IDEA CONCEPT</span>
                      <span style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, textDecoration: isDone ? 'line-through' : 'none' }}>{sugg.visual}</span>
                    </div>

                    <div style={{ background: '#060c17', padding: 14, borderRadius: 10, border: '1px solid #1e293b', opacity: isDone ? 0.5 : 1 }}>
                      <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700 }}>AI VOICE COMPLIANCE</span>
                      <span style={{ fontSize: 13, color: '#c084fc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Volume2 size={14} /> Brand Tone: {sugg.tone}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: '#060c17', border: '1px solid #1e293b', borderRadius: 10, padding: 16, position: 'relative', opacity: isDone ? 0.5 : 1 }}>
                    <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 8, fontWeight: 700 }}>RECOMMENDED CAPTION COPY</span>
                    <p style={{
                      fontSize: 13,
                      color: '#e2e8f0',
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      margin: 0,
                      fontStyle: 'italic',
                      textDecoration: isDone ? 'line-through' : 'none'
                    }}>
                      "{sugg.caption}"
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 14 }}>
                    <button
                      onClick={() => copyToClipboard(sugg.caption, 'Post Caption')}
                      style={{
                        background: 'transparent',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '8px 14px',
                        color: '#94a3b8',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Copy size={14} /> Copy Caption
                    </button>

                    <button
                      onClick={() => handleCreatePostOrderAndNavigate(sugg)}
                      style={{
                        background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 16px',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)'
                      }}
                    >
                      <Plus size={14} /> Create GMB Post Order
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
                  placeholder="e.g. Fix Justdial listing"
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
                    disabled
                    value={clientName}
                    style={{ width: '100%', background: '#121b2e', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none', cursor: 'not-allowed' }}
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
                      placeholder="e.g. Office interior · Team photo"
                      value={newOrder.photosNeeded}
                      onChange={(e) => setNewOrder({ ...newOrder, photosNeeded: e.target.value })}
                      style={{ width: '100%', background: '#060c17', border: '1px solid #1e293b', borderRadius: 8, padding: 10, color: '#fff', fontSize: 13, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 6 }}>Captions (One per line)</label>
                    <textarea
                      rows={3}
                      placeholder={`BM Academy — Pondicherry's #1 training centre`}
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
                    placeholder={`Social Media Marketing\nSEO Services`}
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
