import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PlusCircle, Building, MapPin, Globe, Phone, FileText, Calendar, User, Shield, Info, Link } from 'lucide-react';
import { C } from '../constants/theme.js';
import { api } from '../services/api.js';
import './AllianceDashboard.css';

export const GmbAddClient = ({ isPublic = false }) => {
  const [formData, setFormData] = useState(() => {
    return {
      businessName: '',
      businessType: 'HVAC',
      city: '',
      phone: '',
      contactPerson: '',
      websiteUrl: '',
      gmbUrl: '',
      placeId: '',
      googleEmail: '',
      oauthStatus: 'Not Connected',
      oauthLink: '',
      connectedDate: '',
    };
  });

  const [loading, setLoading] = useState(false);
  const [createdClient, setCreatedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [updatingConnection, setUpdatingConnection] = useState(false);

  const handleUpdateConnection = async () => {
    if (!createdClient?.id) return;
    setUpdatingConnection(true);
    try {
      await api.updateClient(createdClient.id, {
        google_email: formData.googleEmail,
        oauth_status: formData.oauthStatus,
        oauth_connected_at: formData.connectedDate || null
      });
      toast.success('Connection details updated successfully!');
      fetchClients();
    } catch (err) {
      console.error('Failed to update connection details:', err);
      toast.error(err.message || 'Failed to update connection details');
    } finally {
      setUpdatingConnection(false);
    }
  };

  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!createdClient?.id) return;
    if (!window.confirm('Are you sure you want to disconnect Google Business Profile connection? This will clear all connection settings.')) {
      return;
    }
    setDisconnecting(true);
    try {
      await api.disconnectClientGmb(createdClient.id);
      setFormData(prev => ({
        ...prev,
        googleEmail: '',
        oauthStatus: 'Not Connected',
        connectedDate: ''
      }));
      toast.success('Successfully disconnected GMB account');
      fetchClients();
    } catch (err) {
      console.error('Failed to disconnect GMB account:', err);
      toast.error(err.message || 'Failed to disconnect GMB account');
    } finally {
      setDisconnecting(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.getClients();
      const gmbClients = (res.clients || []).filter(c => c.gmb_url);
      setClients(gmbClients);
    } catch (err) {
      console.error('Error fetching GMB clients:', err);
    }
  };

  useEffect(() => {
    fetchClients();
    
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    const clientName = params.get('client_name');
    const errorMsg = params.get('message');
    
    if (oauth === 'success') {
      toast.success(`Successfully connected Google Business Profile for "${clientName || 'Client'}"!`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauth === 'error' || oauth === 'failed') {
      toast.error(`OAuth connection failed: ${errorMsg || 'Unknown error'}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (createdClient?.id) {
      setFormData(prev => ({
        ...prev,
        oauthLink: `${window.location.origin}/api/auth/google?client_id=${createdClient.id}`
      }));
      fetchClients();
    } else {
      setFormData(prev => ({
        ...prev,
        oauthLink: ''
      }));
    }
  }, [createdClient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      new URL(formData.gmbUrl);
    } catch (_) {
      toast.error('Please enter a valid Google Business Profile URL');
      return;
    }

    if (formData.websiteUrl) {
      try {
        new URL(formData.websiteUrl);
      } catch (_) {
        toast.error('Please enter a valid Website URL');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.businessName,
        type: formData.businessType,
        plan: 'Starter', // default
        city: formData.city,
        phone: formData.phone,
        contact_person: formData.contactPerson,
        wa_website: formData.websiteUrl,
        gmb_url: formData.gmbUrl,
        google_email: formData.googleEmail,
        oauth_status: formData.oauthStatus,
        oauth_connected_at: formData.connectedDate || null,
        agreed_price: 0,
        start_date: new Date().toISOString().split('T')[0],
      };

      if (createdClient?.id) {
        await api.updateClient(createdClient.id, payload);
        toast.success(`Client "${formData.businessName}" details updated successfully!`);
        fetchClients();
      } else {
        const res = await api.createClient(payload);
        if (res && res.client) {
          setCreatedClient(res.client);
          toast.success(`Client "${res.client.name}" onboarded successfully!`);
          fetchClients();
        } else {
          toast.error('Failed to onboard client');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to onboard client');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    background: 'var(--navy3, #0c1525)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: '10px 14px',
    color: 'white',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  };

  if (isPublic) {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('oauth');
    const clientName = params.get('client_name') || '';
    const errorMsg = params.get('message') || '';

    return (
      <div className="public-client-portal" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060c17',
        color: 'white',
        padding: '20px',
        fontFamily: "'Inter', sans-serif"
      }}>
        <div style={{
          background: 'rgba(12, 21, 37, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 480,
          padding: 40,
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          position: 'relative'
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 30 }}>
            <div style={{ background: 'var(--gold, #f97316)', padding: 10, borderRadius: 12, display: 'inline-block' }}>
              <Building size={32} color="#000" />
            </div>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, fontFamily: "'Syne', sans-serif" }}>LeadOS</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 30 }}>GMB Onboarding Portal</p>

          {oauthStatus === 'success' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                color: '#22c55e'
              }}>
                <Shield size={24} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'white' }}>Google Account Connected!</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: '20px', marginBottom: 24 }}>
                The Google Business Profile for <strong style={{ color: 'white' }}>{clientName || 'your business'}</strong> has been successfully linked with LeadOS.
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: '16px' }}>
                Our team will now start tracking your local SEO and rankings. You can safely close this browser window.
              </p>
            </div>
          ) : oauthStatus === 'failed' || oauthStatus === 'error' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                color: '#ef4444'
              }}>
                <Info size={24} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'white' }}>Connection Failed</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: '20px', marginBottom: 24 }}>
                There was an error linking your Google Business Profile:
                <br />
                <span style={{ color: '#ef4444', display: 'block', marginTop: 8, fontStyle: 'italic' }}>{errorMsg || 'Authentication flow was cancelled or expired.'}</span>
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: '16px' }}>
                Please contact our support team or try clicking the email invitation link again.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'rgba(249, 115, 22, 0.12)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                color: 'var(--gold, #f97316)'
              }}>
                <Info size={24} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: 'white' }}>Connect Google Listing</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: '20px', marginBottom: 24 }}>
                Please use the official invite link sent to your email to link your Google Business listing.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="section-title" style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: 'white' }}>GMB Mafiya</div>
          <div className="section-subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Onboard and manage Google Business Profile (GMB) Clients for Local SEO Dominance.</div>
        </div>
      </div>

      <div style={{ maxWidth: 850, margin: '0 auto' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card" style={{ padding: 24, background: 'var(--navy2, #0c1525)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14 }}>
            <div className="card-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building size={18} color="var(--gold, #f97316)" />
              Client Details
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
              <div>
                <label style={labelStyle}>Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Premium Auto Garage"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Business Type / Category *</label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                  style={inputStyle}
                  required
                >
                  <option value="HVAC">HVAC</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                  <option value="Plumber">Plumber</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Dentist">Dentist</option>
                  <option value="Restaurant">Restaurant</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Garage / Auto repair">Garage / Auto repair</option>
                  <option value="Salon / Spa">Salon / Spa</option>
                  <option value="Lawyer">Lawyer</option>
                  <option value="Cleaning Services">Cleaning Services</option>
                  <option value="B2B Agency">B2B Agency</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
              <div>
                <label style={labelStyle}>Target City *</label>
                <input
                  type="text"
                  placeholder="e.g. Pondicherry"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
              <div>
                <label style={labelStyle}>Contact Person *</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Website URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="grid-responsive">
              <div>
                <label style={labelStyle}>Google Business Profile URL (GMB URL) *</label>
                <input
                  type="url"
                  placeholder="https://g.co/kgs/xxxxx or https://maps.google.com/?cid=xxxxxxxx"
                  value={formData.gmbUrl}
                  onChange={(e) => setFormData({ ...formData, gmbUrl: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Google Maps Place ID</label>
                <input
                  type="text"
                  placeholder="e.g. ChIJN1t_tDeuEmsRUsoyG83VSY4"
                  value={formData.placeId}
                  onChange={(e) => setFormData({ ...formData, placeId: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Google Business Profile Connection Card (Only shown once client has been created/selected) */}
          {createdClient && (
            <div className="card" style={{ padding: 24, background: 'var(--navy2, #0c1525)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14 }}>
              <div className="card-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={18} color="var(--gold, #f97316)" />
                Google Business Profile Connection
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
                <div>
                  <label style={labelStyle}>Google Account Email</label>
                  <input
                    type="email"
                    placeholder="gmb.owner@gmail.com"
                    value={formData.googleEmail}
                    onChange={(e) => setFormData({ ...formData, googleEmail: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Google GMB OAuth Status</label>
                  <div style={{ display: 'flex', gap: 8, height: 38, alignItems: 'center' }}>
                    <span style={{ 
                      background: formData.oauthStatus === 'Connected' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
                      color: formData.oauthStatus === 'Connected' ? '#4CAF50' : 'rgba(255,255,255,0.5)', 
                      padding: '6px 12px', 
                      borderRadius: 6, 
                      fontSize: 12, 
                      fontWeight: 600 
                    }}>
                      {formData.oauthStatus}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
                <div>
                  <label style={labelStyle}>Invite Link / OAuth Action</label>
                  {formData.oauthLink && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a 
                        href={formData.oauthLink} 
                        target="_self"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(249, 115, 22, 0.15)',
                          border: '1px solid rgba(249, 115, 22, 0.3)',
                          color: 'var(--gold, #f97316)',
                          padding: '8px 16px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: 'none',
                          cursor: 'pointer',
                          transition: 'background 0.2s',
                          boxShadow: '0 2px 8px rgba(249, 115, 22, 0.1)'
                        }}
                      >
                        🔑 Connect GMB Account Now
                      </a>
                      <button 
                        type="button"
                        onClick={handleUpdateConnection}
                        disabled={updatingConnection}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(249, 115, 22, 0.15)',
                          border: '1px solid rgba(249, 115, 22, 0.3)',
                          color: 'var(--gold, #f97316)',
                          padding: '8px 16px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: updatingConnection ? 'not-allowed' : 'pointer',
                          transition: 'background 0.2s',
                          boxShadow: '0 2px 8px rgba(249, 115, 22, 0.1)'
                        }}
                      >
                        {updatingConnection ? 'Saving...' : '💾 Save Connection Details'}
                      </button>
                      {formData.oauthStatus === 'Connected' && (
                        <button 
                          type="button"
                          onClick={handleDisconnect}
                          disabled={disconnecting}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: '8px 16px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: disconnecting ? 'not-allowed' : 'pointer',
                            transition: 'background 0.2s',
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.1)'
                          }}
                        >
                          {disconnecting ? 'Disconnecting...' : '🔌 Disconnect GMB Account'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Connected Date</label>
                  <input
                    type="date"
                    value={formData.connectedDate}
                    onChange={(e) => setFormData({ ...formData, connectedDate: e.target.value })}
                    style={inputStyle}
                    disabled={formData.oauthStatus !== 'Connected'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', width: '100%', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  setCreatedClient(null);
                  setFormData({
                    businessName: '',
                    businessType: 'HVAC',
                    city: '',
                    phone: '',
                    contactPerson: '',
                    websiteUrl: '',
                    gmbUrl: '',
                    placeId: '',
                    googleEmail: '',
                    oauthStatus: 'Not Connected',
                    oauthLink: '',
                    connectedDate: '',
                  });
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  padding: '10px 20px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
              <div style={{ display: 'flex', gap: 12 }}>
                {createdClient ? (
                  <>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        background: 'rgba(249, 115, 22, 0.15)',
                        border: '1px solid rgba(249, 115, 22, 0.3)',
                        color: 'var(--gold, #f97316)',
                        padding: '10px 20px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loading ? 'Saving...' : '💾 Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatedClient(null);
                        setFormData({
                          businessName: '',
                          businessType: 'HVAC',
                          city: '',
                          phone: '',
                          contactPerson: '',
                          websiteUrl: '',
                          gmbUrl: '',
                          placeId: '',
                          googleEmail: '',
                          oauthStatus: 'Not Connected',
                          oauthLink: '',
                          connectedDate: '',
                        });
                      }}
                      style={{
                        background: 'linear-gradient(135deg, var(--gold, #f97316) 0%, #ea580c 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '10px 24px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Onboard New Client
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, var(--gold, #f97316) 0%, #ea580c 100%)',
                      border: 'none',
                      color: 'white',
                      padding: '10px 24px',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(249, 115, 22, 0.25)',
                    }}
                  >
                    <PlusCircle size={16} />
                    {loading ? 'Onboarding...' : 'Onboard Client'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Onboarded GMB Clients List */}
      <div className="card" style={{ padding: 24, background: 'var(--navy2, #0c1525)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14, marginTop: 24 }}>
        <div className="card-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building size={18} color="var(--gold, #f97316)" />
          Onboarded GMB Clients
        </div>
        
        {clients.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No GMB Mafiya clients onboarded yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: 'white' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Business Name</th>
                  <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>City</th>
                  <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>GMB Status</th>
                  <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Email Connected</th>
                  <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Connected Date</th>
                  <th style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{client.name}</td>
                    <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.7)' }}>{client.type || 'N/A'}</td>
                    <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.7)' }}>{client.city || 'N/A'}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ 
                        background: client.oauth_status === 'Connected' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
                        color: client.oauth_status === 'Connected' ? '#4CAF50' : 'rgba(255,255,255,0.5)', 
                        padding: '3px 8px', 
                        borderRadius: 12, 
                        fontSize: 11, 
                        fontWeight: 600 
                      }}>
                        {client.oauth_status || 'Not Connected'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{client.google_email || 'Not Connected'}</td>
                    <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                      {client.oauth_connected_at ? new Date(client.oauth_connected_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <button
                        onClick={() => {
                          setFormData({
                            businessName: client.name,
                            businessType: client.type || 'HVAC',
                            city: client.city || '',
                            phone: client.phone || '',
                            contactPerson: client.contact_person || '',
                            websiteUrl: client.wa_website || '',
                            gmbUrl: client.gmb_url || '',
                            placeId: client.placeId || '',
                            googleEmail: client.google_email || '',
                            oauthStatus: client.oauth_status || 'Not Connected',
                            oauthLink: `${window.location.origin}/api/auth/google?client_id=${client.id}`,
                            connectedDate: client.oauth_connected_at ? client.oauth_connected_at.split('T')[0] : '',
                          });
                          setCreatedClient(client);
                          toast.success(`Loaded connection status for ${client.name}`);
                        }}
                        style={{
                          background: 'rgba(249, 115, 22, 0.1)',
                          border: '1px solid rgba(249, 115, 22, 0.2)',
                          color: 'var(--gold, #f97316)',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Manage OAuth
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to delete client "${client.name}"?`)) {
                            try {
                              await api.deleteClient(client.id);
                              toast.success(`Client "${client.name}" deleted successfully`);
                              fetchClients();
                              if (createdClient?.id === client.id) {
                                setCreatedClient(null);
                              }
                            } catch (err) {
                              toast.error(err.message || 'Failed to delete client');
                            }
                          }
                        }}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          marginLeft: 8,
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};