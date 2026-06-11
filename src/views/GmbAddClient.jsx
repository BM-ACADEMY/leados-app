import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PlusCircle, Building, MapPin, Globe, Phone, FileText, Calendar, DollarSign, User, Shield, Info, Link, Star } from 'lucide-react';
import { C } from '../constants/theme.js';
import { api } from '../services/api.js';
import './AllianceDashboard.css';

export const GmbAddClient = () => {
  const [mafiyaPlans] = useState(() => {
    const saved = localStorage.getItem('gmb_mafiya_plans');
    return saved ? JSON.parse(saved) : [
      { name: 'Starter', price: '2,999', features: ['4 posts/month', '3 keywords', 'Basic report'], isPopular: false },
      { name: 'Growth', price: '4,999', features: ['8 posts/month', '5 keywords', 'Full report + competitor'], isPopular: true },
      { name: 'Business', price: '8,999', features: ['12 posts/month', '10 keywords', 'Advanced SEO + calls'], isPopular: false }
    ];
  });

  const [formData, setFormData] = useState(() => {
    const defaultPlan = mafiyaPlans[0] || { name: 'Starter', price: '2,999' };
    const defaultPrice = defaultPlan.price.replace(/[₹,]/g, '');

    return {
      businessName: '',
      businessType: 'HVAC',
      city: '',
      phone: '',
      contactPerson: '',
      websiteUrl: '',
      gmbUrl: '',
      placeId: '',
      plan: defaultPlan.name,
      agreedPrice: defaultPrice,
      startDate: '',
      // Connection section
      googleEmail: '',
      oauthStatus: 'Not Connected',
      oauthLink: '',
      connectedDate: '',
    };
  });

  const [loading, setLoading] = useState(false);
  const [createdClient, setCreatedClient] = useState(null);
  const [clients, setClients] = useState([]);
  const [paymentLink, setPaymentLink] = useState('');
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [paymentLinkId, setPaymentLinkId] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
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

  const handleNextStep1 = () => {
    if (!formData.businessName || !formData.city || !formData.phone || !formData.contactPerson || !formData.gmbUrl) {
      toast.error('Please fill in all required fields marked with *');
      return;
    }
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
    setCurrentStep(2);
  };

  const handleVerifyPayment = async () => {
    if (!paymentLinkId) {
      toast.error('No active payment link to verify.');
      return;
    }
    setVerifyingPayment(true);
    try {
      const res = await api.checkPaymentLinkStatus(paymentLinkId);
      if (res && (res.status === 'paid' || res.status === 'captured')) {
        toast.success('Payment verified successfully via Razorpay!');
        if (createdClient?.id) {
          localStorage.setItem(`gmb_client_paid_${createdClient.id}`, 'true');
        }
        setPaymentSuccess(true);
        setCurrentStep(3);
      } else {
        toast.error(`Payment not completed yet (Status: ${res.status || 'pending'}). Please pay and try again.`);
      }
    } catch (err) {
      console.error('Verification failed:', err);
      toast.error(err.message || 'Payment verification failed');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleRazorpayCheckout = async (clientId, price, planName, clientName) => {
    try {
      const loadingToastId = toast.loading('Initializing Checkout...');
      
      const scriptLoaded = await new Promise((resolve) => {
        if (window.Razorpay) {
          resolve(true);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });

      if (!scriptLoaded) {
        toast.dismiss(loadingToastId);
        toast.error('Failed to load Razorpay SDK');
        return;
      }

      const orderData = await api.createClientOrder(clientId, price);
      toast.dismiss(loadingToastId);

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: 'INR',
        name: 'LeadOS',
        description: `Payment for plan ${planName} of ${clientName}`,
        order_id: orderData.order_id,
        handler: function (response) {
          toast.success('Payment completed successfully via Razorpay Modal!');
          localStorage.setItem(`gmb_client_paid_${clientId}`, 'true');
          setPaymentSuccess(true);
          setCurrentStep(3);
        },
        prefill: {
          name: orderData.client.contact_person,
          email: orderData.client.email,
          contact: orderData.client.phone
        },
        theme: {
          color: '#f97316' // Kept clean to avoid standard modal container style corruption
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Razorpay Checkout Modal error:', err);
      toast.error(`Checkout initialization failed: ${err.message}`);
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

  const handleGeneratePayment = async (clientId, price) => {
    if (!price || parseFloat(price) <= 0) return;
    setGeneratingPayment(true);
    try {
      const res = await api.createClientPaymentLink(clientId, price, `GMB Mafiya Onboarding Payment`);
      if (res && res.payment_link) {
        setPaymentLink(res.payment_link);
        if (res.link_id) {
          setPaymentLinkId(res.link_id);
        }
      }
    } catch (err) {
      console.error('Failed to generate payment link:', err);
      toast.error('Failed to generate Razorpay Payment Link');
    } finally {
      setGeneratingPayment(false);
    }
  };

  useEffect(() => {
    fetchClients();
    
    const params = new URLSearchParams(window.location.search);
    const oauth = params.get('oauth');
    const clientName = params.get('client_name');
    const errorMsg = params.get('message');
    const paymentStatus = params.get('payment');
    
    if (oauth === 'success') {
      toast.success(`Successfully connected Google Business Profile for "${clientName || 'Client'}"!`);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauth === 'error' || oauth === 'failed') {
      toast.error(`OAuth connection failed: ${errorMsg || 'Unknown error'}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (paymentStatus === 'success') {
      toast.success(`Payment successful via Razorpay for "${clientName || 'Client'}"!`);
      if (createdClient?.id) {
        localStorage.setItem(`gmb_client_paid_${createdClient.id}`, 'true');
      }
      setPaymentSuccess(true);
      setCurrentStep(3);
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
      if (formData.agreedPrice) {
        handleGeneratePayment(createdClient.id, formData.agreedPrice);
      }
      const isPaid = localStorage.getItem(`gmb_client_paid_${createdClient.id}`) === 'true';
      setPaymentSuccess(isPaid);
    } else {
      setPaymentLink('');
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
      // Map plans to DB check constraints: Starter, Pro, Enterprise
      const getDbPlan = (planName, priceStr) => {
        const nameLower = planName.toLowerCase();
        if (nameLower.includes('starter')) return 'Starter';
        if (nameLower.includes('growth') || nameLower.includes('pro')) return 'Pro';
        if (nameLower.includes('business') || nameLower.includes('enterprise')) return 'Enterprise';
        
        const price = parseFloat(priceStr) || 0;
        if (price <= 3000) return 'Starter';
        if (price <= 6000) return 'Pro';
        return 'Enterprise';
      };

      const payload = {
        name: formData.businessName,
        type: formData.businessType,
        plan: getDbPlan(formData.plan, formData.agreedPrice),
        city: formData.city,
        phone: formData.phone,
        contact_person: formData.contactPerson,
        wa_website: formData.websiteUrl,
        gmb_url: formData.gmbUrl,
        google_email: formData.googleEmail,
        oauth_status: formData.oauthStatus,
        oauth_connected_at: formData.connectedDate || null,
        agreed_price: formData.agreedPrice,
        start_date: formData.startDate,
      };

      if (createdClient?.id) {
        await api.updateClient(createdClient.id, payload);
        toast.success(`Client "${formData.businessName}" details updated successfully!`);
        fetchClients();
      } else {
        const res = await api.createClient(payload);
        if (res && res.client) {
          setCreatedClient(res.client);
          toast.success(`Client "${res.client.name}" onboarded to SMB Growth Platform successfully!`);
          
          if (formData.agreedPrice && parseFloat(formData.agreedPrice) > 0) {
            handleRazorpayCheckout(res.client.id, formData.agreedPrice, formData.plan, res.client.name);
          } else {
            setPaymentSuccess(true);
            setCurrentStep(2);
          }
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

  return (
    <div className="alliance-dashboard" style={{ height: '100%', overflowY: 'auto', padding: '24px' }}>
      <div className="section-header" style={{ marginBottom: 24 }}>
        <div>
          <div className="section-title" style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 4, color: 'white' }}>GMB Mafiya</div>
          <div className="section-subtitle" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Onboard and manage Google Business Profile (GMB) Clients for Local SEO Dominance.</div>
        </div>
      </div>

      <div style={{ maxWidth: 850, margin: '0 auto' }}>
        {/* Stepper Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 32, maxWidth: 450, margin: '0 auto 32px' }}>
          {/* Step 1: Details & Connection */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: currentStep >= 1 ? 'var(--gold, #f97316)' : 'transparent',
              border: currentStep >= 1 ? 'none' : '2px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              color: currentStep >= 1 ? '#000' : 'rgba(255,255,255,0.4)',
              boxShadow: currentStep === 1 ? '0 0 12px rgba(249, 115, 22, 0.4)' : 'none',
              transition: 'all 0.3s'
            }}>
              1
            </div>
            <span style={{ fontSize: 11, color: currentStep >= 1 ? 'var(--gold, #f97316)' : 'rgba(255,255,255,0.4)', marginTop: 6, fontWeight: 600 }}>Details & Connection</span>
          </div>

          {/* Line 1 */}
          <div style={{ height: 2, background: currentStep >= 2 ? 'var(--gold, #f97316)' : 'rgba(255,255,255,0.1)', flex: 2, marginBottom: 16, transition: 'all 0.3s' }} />

          {/* Step 2: Plan & Payment */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: currentStep >= 2 ? 'var(--gold, #f97316)' : 'transparent',
              border: currentStep >= 2 ? 'none' : '2px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
              color: currentStep >= 2 ? '#000' : 'rgba(255,255,255,0.4)',
              boxShadow: currentStep === 2 ? '0 0 12px rgba(249, 115, 22, 0.4)' : 'none',
              transition: 'all 0.3s'
            }}>
              2
            </div>
            <span style={{ fontSize: 11, color: currentStep >= 2 ? 'var(--gold, #f97316)' : 'rgba(255,255,255,0.4)', marginTop: 6, fontWeight: 600 }}>Plan & Payment</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {currentStep === 1 && (
            <>
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
                  <label style={labelStyle}>Business Type *</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    style={inputStyle}
                    required
                  >
                    <option value="HVAC">HVAC</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Dental">Dental</option>
                    <option value="Retail">Retail</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Legal">Legal</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Other">Other SMB</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
                <div>
                  <label style={labelStyle}>City *</label>
                  <input
                    type="text"
                    placeholder="e.g. New York"
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
                    placeholder="e.g. +1 555-0199"
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

            {/* Google Business Profile Connection Card */}
            <div className="card" style={{ padding: 24, background: 'var(--navy2, #0c1525)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14, marginTop: 20 }}>
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
                  <label style={labelStyle}>OAuth Status</label>
                  <select
                    value={formData.oauthStatus}
                    onChange={(e) => setFormData({ ...formData, oauthStatus: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Not Connected">Not Connected</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Connected">Connected</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 8 }} className="grid-responsive">
                <div>
                  <label style={labelStyle}>OAuth Link (Read Only)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={formData.oauthLink || 'Generate client first to get OAuth Link'}
                      readOnly
                      style={{ ...inputStyle, paddingRight: 40, color: 'rgba(255,255,255,0.4)', textOverflow: 'ellipsis' }}
                      onClick={(e) => {
                        if (!formData.oauthLink) return;
                        e.target.select();
                        navigator.clipboard.writeText(formData.oauthLink);
                        toast.success('OAuth link copied to clipboard!');
                      }}
                    />
                    {formData.oauthLink && (
                      <div style={{ position: 'absolute', right: 10, top: 10, cursor: 'pointer', color: 'var(--gold, #f97316)' }} title="Click to copy">
                        <Link size={16} />
                      </div>
                    )}
                  </div>
                  {createdClient && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
                      {!paymentSuccess && createdClient && formData.agreedPrice && parseFloat(formData.agreedPrice) > 0 && (
                        <button 
                          type="button"
                          onClick={() => handleRazorpayCheckout(createdClient.id, formData.agreedPrice, formData.plan, createdClient.name)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(34, 197, 94, 0.15)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            color: '#22c55e',
                            padding: '8px 16px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)'
                          }}
                        >
                          💳 Pay with Razorpay (₹{formData.agreedPrice})
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
            </>
          )}

          {currentStep === 2 && (
            <div className="card" style={{ padding: 24, background: 'var(--navy2, #0c1525)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 14 }}>
              {createdClient ? (
                <div>
                  <div className="card-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={18} color="var(--gold, #f97316)" />
                    Verify Payment - {createdClient.name}
                  </div>
                  {paymentSuccess ? (
                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: 10, padding: 18, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 700 }}>✓ Payment Verified & Completed Successfully!</span>
                    </div>
                  ) : (
                    <>
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 20 }}>
                        Please complete the payment of <strong>₹{formData.agreedPrice}</strong>. We opened the checkout modal. If you need to reopen the checkout, click the button below:
                      </p>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleRazorpayCheckout(createdClient.id, formData.agreedPrice, formData.plan, createdClient.name)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                            border: 'none',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
                          }}
                        >
                          💳 Pay Now (Razorpay)
                        </button>
                        {paymentLinkId && (
                          <button
                            type="button"
                            onClick={handleVerifyPayment}
                            disabled={verifyingPayment}
                            style={{
                              background: 'var(--gold, #f97316)',
                              border: 'none',
                              color: 'black',
                              padding: '10px 20px',
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 700,
                              cursor: verifyingPayment ? 'not-allowed' : 'pointer',
                              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)'
                            }}
                          >
                            {verifyingPayment ? 'Verifying...' : '🔄 Verify Payment Status'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="card-title" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: 'white', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Building size={18} color="var(--gold, #f97316)" />
                    Choose Pricing Plan
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Select Plan *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 8 }}>
                      {mafiyaPlans.map((p) => {
                        const isSelected = formData.plan === p.name;
                        const rawPrice = parseFloat(p.price.replace(/[₹,]/g, '')) || 0;
                        return (
                          <div
                            key={p.name}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                plan: p.name,
                                agreedPrice: rawPrice.toString()
                              });
                            }}
                            style={{
                              background: 'var(--navy3, #0c1525)',
                              border: isSelected ? '2px solid #eab308' : '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 12,
                              padding: '16px 20px',
                              cursor: 'pointer',
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              transition: 'all 0.2s',
                              transform: isSelected ? 'scale(1.02)' : 'none',
                              boxShadow: isSelected ? '0 4px 14px rgba(234, 179, 8, 0.15)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: p.isPopular ? '#eab308' : 'white' }}>
                                {p.name}
                              </span>
                              {p.isPopular && (
                                <span style={{ color: '#eab308', display: 'flex', alignItems: 'center' }}>
                                  <Star size={11} fill="#eab308" />
                                </span>
                              )}
                            </div>

                            <div style={{ marginBottom: 12 }}>
                              <span style={{ fontSize: 20, fontWeight: 800, color: 'white', fontFamily: "'Syne',sans-serif" }}>
                                {p.price.includes('₹') ? p.price : `₹${p.price}`}
                              </span>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>/mo</span>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                              {p.features.map((feat, fidx) => (
                                <li key={fidx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ color: p.isPopular ? '#eab308' : 'var(--gold, #f97316)' }}>•</span>
                                  {feat}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }} className="grid-responsive">
                    <div>
                      <label style={labelStyle}>Agreed Price (INR / Month) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 15000"
                        value={formData.agreedPrice}
                        onChange={(e) => setFormData({ ...formData, agreedPrice: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Start Date *</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', width: '100%', marginTop: 8 }}>
            {currentStep === 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedClient(null);
                    setPaymentSuccess(false);
                    const defaultPlan = mafiyaPlans[0] || { name: 'Starter', price: '2,999' };
                    const defaultPrice = defaultPlan.price.replace(/[₹,]/g, '');
                    setFormData({
                      businessName: '',
                      businessType: 'HVAC',
                      city: '',
                      phone: '',
                      contactPerson: '',
                      websiteUrl: '',
                      gmbUrl: '',
                      placeId: '',
                      plan: defaultPlan.name,
                      agreedPrice: defaultPrice,
                      startDate: '',
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
                  {createdClient && (
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
                  )}
                  <button
                    type="button"
                    onClick={handleNextStep1}
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
                    Next: Plan & Payment
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
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
                  Back to Details
                </button>
                {createdClient ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCreatedClient(null);
                      setPaymentLink('');
                      setPaymentSuccess(false);
                      const defaultPlan = mafiyaPlans[0] || { name: 'Starter', price: '2,999' };
                      const defaultPrice = defaultPlan.price.replace(/[₹,]/g, '');
                      setFormData({
                        businessName: '',
                        businessType: 'HVAC',
                        city: '',
                        phone: '',
                        contactPerson: '',
                        websiteUrl: '',
                        gmbUrl: '',
                        placeId: '',
                        plan: defaultPlan.name,
                        agreedPrice: defaultPrice,
                        startDate: '',
                        googleEmail: '',
                        oauthStatus: 'Not Connected',
                        oauthLink: '',
                        connectedDate: '',
                      });
                      setCurrentStep(1);
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
                    {loading ? 'Onboarding...' : 'Onboard Client & Pay'}
                  </button>
                )}
              </div>
            )}
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
                            plan: client.plan === 'Pro' ? 'Growth' : (client.plan === 'Enterprise' ? 'Business' : 'Starter'),
                            agreedPrice: client.agreed_price || '',
                            startDate: client.start_date ? client.start_date.split('T')[0] : '',
                            googleEmail: client.google_email || '',
                            oauthStatus: client.oauth_status || 'Not Connected',
                            oauthLink: `${window.location.origin}/api/auth/google?client_id=${client.id}`,
                            connectedDate: client.oauth_connected_at ? client.oauth_connected_at.split('T')[0] : '',
                          });
                          setCreatedClient(client);
                          setPaymentSuccess(localStorage.getItem(`gmb_client_paid_${client.id}`) === 'true');
                          setCurrentStep(1);
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
                      {localStorage.getItem(`gmb_client_paid_${client.id}`) === 'true' ? (
                        <span style={{ 
                          color: '#22c55e', 
                          padding: '4px 10px', 
                          fontSize: 11, 
                          fontWeight: 600, 
                          marginLeft: 8 
                        }}>
                          ✓ Paid
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            handleRazorpayCheckout(client.id, client.agreed_price || 0, client.plan, client.name);
                          }}
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            color: '#22c55e',
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginLeft: 8,
                          }}
                        >
                          Razorpay Pay
                        </button>
                      )}
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