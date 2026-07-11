import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
import { C } from '../../constants/theme.js';
import { 
  Megaphone, Plus, Trash2, Download, Sparkles, 
  Loader2, Check, Star, X, MoreVertical, ImagePlus 
} from 'lucide-react';
import toast from 'react-hot-toast';

const GmbPostModal = ({ activeClient, fetchGmbPosts, showModal, setShowModal }) => {
  const [saving, setSaving] = useState(false);
  // Upload Poster states
  const [postType, setPostType] = useState('Update');
  const [description, setDescription] = useState('');
  const [schedulePost, setSchedulePost] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [hasButton, setHasButton] = useState(false);
  const [buttonType, setButtonType] = useState('None');
  const [buttonLink, setButtonLink] = useState('');
  
  // Offer & Event specific states
  const [postTitle, setPostTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [redeemLink, setRedeemLink] = useState('');
  const [terms, setTerms] = useState('');
  
  const [showCoupon, setShowCoupon] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [locations, setLocations] = useState([]);
  const [fetchingLocations, setFetchingLocations] = useState(false);
  const [selectedLocationStr, setSelectedLocationStr] = useState('');

  useEffect(() => {
    if (showModal && activeClient && !activeClient.google_location_id) {
      const fetchLocs = async () => {
        setFetchingLocations(true);
        try {
          const token = localStorage.getItem('leados_token');
          const res = await axios.get(`${API_URL}/api/mafiya/reviews/google-locations?clientId=${activeClient.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = res.data;
          setLocations(data);
          if (data.length > 0) setSelectedLocationStr(data[0].accountId + '|' + data[0].locationId);
        } catch (e) {
          console.error(e);
        } finally {
          setFetchingLocations(false);
        }
      };
      fetchLocs();
    }
  }, [showModal, activeClient]);

  const handleSaveConnection = async () => {
    if (!selectedLocationStr) return;
    const [accId, locId] = selectedLocationStr.split('|');
    setSaving(true);
    try {
      const token = localStorage.getItem('leados_token');
      await axios.put(`${API_URL}/api/mafiya/reviews/google-locations`, {
          clientId: activeClient.id,
          google_account_id: accId,
          google_location_id: locId
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Connected to GMB Location!');
        activeClient.google_account_id = accId;
        activeClient.google_location_id = locId;
        setLocations([...locations]); // force re-render
    } catch(err) {
      toast.error('Failed to connect location');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Uploaded Post
  const handleSavePost = async () => {
    if (!description) {
      toast.error('Description is required');
      return;
    }
    if ((postType === 'Offer' || postType === 'Event') && !postTitle) {
      toast.error('Title is required for Offer/Event');
      return;
    }
    if ((postType === 'Offer' || postType === 'Event') && (!startDate || !endDate)) {
      toast.error('Start and End dates are required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('leados_token');
      await axios.post(`${API_URL}/api/mafiya/reviews/posts`, {
          clientId: activeClient.id,
          postType: postType,
          caption: description,
          posterTitle: (postType === 'Offer' || postType === 'Event') ? postTitle : postType.toUpperCase(),
          posterSubtitle: buttonType !== 'None' ? `${buttonType}|${buttonLink}` : '',
          bgTheme: 'custom_stock',
          imageUrl: selectedImage || '',
          status: 'published',
          postTitle: postTitle,
          startDate: startDate || null,
          endDate: endDate || null,
          startTime: startTime || null,
          endTime: endTime || null,
          couponCode: couponCode || null,
          redeemLink: redeemLink || null,
          terms: terms || null
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Published to GMB Successfully!');
        setShowModal(false);
        fetchGmbPosts(activeClient.id);
        setDescription('');
        setSelectedImage(null);
        setPostTitle('');
        setStartDate('');
        setEndDate('');
        setStartTime('');
        setEndTime('');
        setCouponCode('');
        setRedeemLink('');
        setTerms('');
        setHasButton(false);
        setButtonType('None');
        setButtonLink('');
      
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };




  const clientName = activeClient?.business_name || 'GMB Profile';
  const contactPhone = activeClient?.phone_number || '';

  return (
    <>
              {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 20 }}>
            <div style={{ background: '#202124', width: '100%', maxWidth: 760, maxHeight: '90vh', borderRadius: 8, overflow: 'hidden', boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14)', display: 'flex', flexDirection: 'column' }}>
              
              {/* Header */}
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #3c4043' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#e8eaed' }}>Add post</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <X size={24} color="#9aa0a6" style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
                </div>
              </div>

              <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

                {!activeClient?.google_location_id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: 40, textAlign: 'center' }}>
                    <div style={{ background: '#f973161a', padding: 16, borderRadius: '50%', marginBottom: 16 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </div>
                    <h3 style={{ color: '#e8eaed', fontSize: 20, margin: '0 0 12px 0' }}>Connect Google Business Location</h3>
                    <p style={{ color: '#9aa0a6', fontSize: 14, maxWidth: 400, marginBottom: 24 }}>
                      To publish posts to Google, please select the specific business location for {clientName} from your Google Account.
                    </p>
                    
                    {fetchingLocations ? (
                      <p style={{ color: '#8ab4f8' }}>Fetching your locations...</p>
                    ) : locations.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 350 }}>
                        <select 
                          value={selectedLocationStr}
                          onChange={e => setSelectedLocationStr(e.target.value)}
                          style={{ background: '#202124', border: '1px solid #5f6368', color: '#e8eaed', padding: '12px 16px', borderRadius: 6, fontSize: 14, outline: 'none' }}
                        >
                          {locations.map((loc, i) => (
                            <option key={i} value={loc.accountId + '|' + loc.locationId}>{loc.title}</option>
                          ))}
                        </select>
                        <button 
                          onClick={handleSaveConnection}
                          disabled={saving}
                          style={{ background: '#f97316', color: '#fff', border: 'none', padding: '12px', borderRadius: 6, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer' }}
                        >
                          {saving ? 'Connecting...' : 'Save Connection'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(239,68,68,0.1)', padding: 16, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)', width: '100%', maxWidth: 400 }}>
                        <p style={{ color: '#ef4444', margin: 0, fontSize: 14 }}>
                          We couldn't find any locations in your Google Account. Please ensure you have connected an account that manages Google Business Profiles in the Local SEO Bridge.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  {['Update', 'Offer', 'Event'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setPostType(tab)}
                      style={{ 
                        background: postType === tab ? '#3a3f4b' : 'transparent', 
                        border: `1px solid ${postType === tab ? '#8ab4f8' : '#5f6368'}`,
                        color: postType === tab ? '#8ab4f8' : '#e8eaed',
                        padding: '6px 16px',
                        borderRadius: 16,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      {postType === tab && <Check size={16} />}
                      {tab}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* Dynamic Fields for Offer & Event */}
                    {(postType === 'Offer' || postType === 'Event') && (
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="text"
                          value={postTitle}
                          onChange={(e) => setPostTitle(e.target.value.slice(0, 58))}
                          placeholder="Title*"
                          style={{ 
                            width: '100%',
                            background: 'transparent', 
                            border: '1px solid #5f6368', 
                            borderRadius: 4, 
                            padding: '16px 12px 24px 12px', 
                            color: '#e8eaed', 
                            fontSize: 14, 
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                        <div style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 11, color: '#9aa0a6' }}>
                          {postTitle.length}/58
                        </div>
                      </div>
                    )}

                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 1500))}
                        placeholder="Description"
                        style={{ 
                          width: '100%', 
                          height: 100, 
                          background: 'transparent', 
                          border: '1px solid #5f6368', 
                          borderRadius: 4, 
                          padding: '16px 12px', 
                          color: '#e8eaed', 
                          fontSize: 14, 
                          outline: 'none', 
                          resize: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, color: '#9aa0a6' }}>
                        {description.length}/1,500
                      </div>
                    </div>

                    {(postType === 'Offer' || postType === 'Event') && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: -8, left: 10, background: '#202124', padding: '0 4px', fontSize: 11, color: '#9aa0a6' }}>Start date*</div>
                            <input 
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                          </div>
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: -8, left: 10, background: '#202124', padding: '0 4px', fontSize: 11, color: '#9aa0a6' }}>Start time</div>
                            <input 
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: -8, left: 10, background: '#202124', padding: '0 4px', fontSize: 11, color: '#9aa0a6' }}>End Date*</div>
                            <input 
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                          </div>
                          <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: -8, left: 10, background: '#202124', padding: '0 4px', fontSize: 11, color: '#9aa0a6' }}>End time</div>
                            <input 
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                          </div>
                        </div>

                        <div style={{ position: 'relative', marginTop: 8 }}>
                          <div style={{ position: 'absolute', top: -8, left: 10, background: '#202124', padding: '0 4px', fontSize: 11, color: '#9aa0a6' }}>Repeats</div>
                          <select 
                            style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer' }}
                          >
                            <option style={{background: '#202124'}}>Does not repeat</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                      <span style={{ fontSize: 15, color: '#e8eaed', fontWeight: 600 }}>Schedule this post</span>
                      <div 
                        onClick={() => setSchedulePost(!schedulePost)}
                        style={{ 
                          width: 36, height: 20, 
                          background: schedulePost ? '#8ab4f8' : '#5f6368', 
                          borderRadius: 12, 
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background 0.3s'
                        }}
                      >
                        <div style={{ 
                          width: 16, height: 16, 
                          background: '#fff', 
                          borderRadius: '50%',
                          position: 'absolute',
                          top: 2, left: schedulePost ? 18 : 2,
                          transition: 'left 0.3s'
                        }} />
                      </div>
                    </div>
                    
                    <div style={{ height: 1, background: '#3c4043', margin: '4px 0' }} />

                    {/* Add more details section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#e8eaed' }}>Add more details</h3>
                      
                      {postType === 'Offer' ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          <button onClick={() => setShowTerms(!showTerms)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: showTerms ? 'rgba(138,180,248,0.1)' : 'transparent', border: `1px solid ${showTerms ? '#8ab4f8' : '#5f6368'}`, borderRadius: 16, padding: '6px 14px', color: showTerms ? '#8ab4f8' : '#e8eaed', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                            {showTerms ? <X size={14}/> : <Plus size={14}/>} Terms
                          </button>
                          <button onClick={() => setShowCoupon(!showCoupon)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: showCoupon ? 'rgba(138,180,248,0.1)' : 'transparent', border: `1px solid ${showCoupon ? '#8ab4f8' : '#5f6368'}`, borderRadius: 16, padding: '6px 14px', color: showCoupon ? '#8ab4f8' : '#e8eaed', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                            {showCoupon ? <X size={14}/> : <Plus size={14}/>} Coupon code
                          </button>
                          <button onClick={() => setShowRedeem(!showRedeem)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: showRedeem ? 'rgba(138,180,248,0.1)' : 'transparent', border: `1px solid ${showRedeem ? '#8ab4f8' : '#5f6368'}`, borderRadius: 16, padding: '6px 14px', color: showRedeem ? '#8ab4f8' : '#e8eaed', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                            {showRedeem ? <X size={14}/> : <Plus size={14}/>} Link to redeem offer
                          </button>

                          {showTerms && (
                            <div style={{ width: '100%', marginTop: 8 }}>
                              <input type="text" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Terms and conditions" style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }} />
                            </div>
                          )}
                          {showCoupon && (
                            <div style={{ width: '100%', marginTop: 8 }}>
                              <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Coupon code" style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }} />
                            </div>
                          )}
                          {showRedeem && (
                            <div style={{ width: '100%', marginTop: 8 }}>
                              <input type="url" value={redeemLink} onChange={e => setRedeemLink(e.target.value)} placeholder="Link to redeem offer" style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }} />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          <button 
                            onClick={() => { setHasButton(!hasButton); if(!hasButton) setButtonType('Call now'); }}
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: 6,
                              background: hasButton ? 'rgba(138,180,248,0.1)' : 'transparent', 
                              border: `1px solid ${hasButton ? '#8ab4f8' : '#5f6368'}`,
                              borderRadius: 16, padding: '6px 14px', 
                              color: hasButton ? '#8ab4f8' : '#e8eaed', 
                              fontSize: 13, fontWeight: 500, cursor: 'pointer',
                              alignSelf: 'flex-start'
                            }}
                          >
                            {hasButton ? <X size={14}/> : <Plus size={14}/>} Button
                          </button>
                          
                          {hasButton && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e8eaed' }}>Add a button (optional)</h4>
                                <select 
                                  value={buttonType}
                                  onChange={(e) => setButtonType(e.target.value)}
                                  style={{
                                    background: 'transparent',
                                    border: '1px solid #5f6368',
                                    borderRadius: 4,
                                    padding: '16px 12px',
                                    color: '#e8eaed',
                                    fontSize: 14,
                                    outline: 'none',
                                    cursor: 'pointer',
                                    width: '100%',
                                    boxSizing: 'border-box'
                                  }}
                                >
                                  <option value="None" style={{ background: '#202124' }}>None</option>
                                  <option value="Book" style={{ background: '#202124' }}>Book</option>
                                  <option value="Order online" style={{ background: '#202124' }}>Order online</option>
                                  <option value="Buy" style={{ background: '#202124' }}>Buy</option>
                                  <option value="Learn more" style={{ background: '#202124' }}>Learn more</option>
                                  <option value="Sign up" style={{ background: '#202124' }}>Sign up</option>
                                  <option value="Call now" style={{ background: '#202124' }}>Call now</option>
                                </select>
                              </div>

                              {buttonType === 'Call now' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <div style={{ position: 'relative', marginTop: 4 }}>
                                    <div style={{ position: 'absolute', top: -8, left: 10, background: '#202124', padding: '0 4px', fontSize: 11, color: '#9aa0a6' }}>Phone number</div>
                                    <div style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14 }}>
                                      {contactPhone || 'No phone number available'}
                                    </div>
                                  </div>
                                  <span style={{ fontSize: 11, color: '#9aa0a6' }}>Customers will call this number</span>
                                </div>
                              ) : buttonType !== 'None' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <div style={{ position: 'relative', marginTop: 4 }}>
                                    <div style={{ position: 'absolute', top: -8, left: 10, background: '#202124', padding: '0 4px', fontSize: 11, color: '#9aa0a6' }}>Link for your button</div>
                                    <input 
                                      type="url"
                                      value={buttonLink}
                                      onChange={(e) => setButtonLink(e.target.value)}
                                      style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Right Column (Image Upload) */}
                  <div>
                    <label style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: 220,
                      border: '1px solid #5f6368',
                      borderRadius: 4,
                      background: 'transparent',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      {selectedImage ? (
                        <>
                          <img src={selectedImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>Change image</span>
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                          <span style={{ color: '#e8eaed', fontSize: 15, fontWeight: 600, display: 'block', marginBottom: 24 }}>Drag images and videos here</span>
                          <span style={{ color: '#9aa0a6', fontSize: 13, display: 'block', marginBottom: 24 }}>or</span>
                          <span style={{ color: '#8ab4f8', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <ImagePlus size={18} /> Select images and videos
                          </span>
                        </div>
                      )}
                      <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                  </>
                )}
              </div>
              {/* Footer */}
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #3c4043' }}>
                <button
                  onClick={handleSavePost}
                  disabled={saving || !description}
                  style={{ 
                    background: '#8ab4f8', 
                    color: '#202124', 
                    border: 'none', 
                    borderRadius: 4, 
                    padding: '8px 24px', 
                    fontSize: 14, 
                    fontWeight: 500, 
                    cursor: (saving || !description) ? 'not-allowed' : 'pointer',
                    opacity: (saving || !description) ? 0.6 : 1
                  }}
                >
                  {saving ? 'Posting...' : 'Post'}
                </button>
              </div>

            </div>
          </div>
        )}
    </>
  );
};


export default function StreetPosts() {
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClientState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);


  const setActiveClient = (client) => {
    setActiveClientState(client);
    if (client) {
      localStorage.setItem('activeGmbClient', JSON.stringify(client));
    } else {
      localStorage.removeItem('activeGmbClient');
    }
  };

  // Fetch Clients
  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('leados_token');
      const { data: clientsData } = await axios.get(`${API_URL}/api/mafiya/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClients(clientsData);
      if (clientsData.length > 0) {
        const savedGmbClient = localStorage.getItem('activeGmbClient');
        if (savedGmbClient) {
          try {
            const parsed = JSON.parse(savedGmbClient);
            const found = clientsData.find(c => c.id === parsed.id);
            if (found) {
              setActiveClient(found);
              setLoading(false);
              return;
            }
          } catch (e) {}
        }
        setActiveClient(clientsData[0]);
      }
    } catch (err) {
      toast.error('Failed to load GMB clients');
    } finally {
      setLoading(false);
    }
  };

  // Fetch GMB Posts
  const fetchGmbPosts = async (clientId) => {
    if (!clientId) return;
    setPostsLoading(true);
    try {
      const token = localStorage.getItem('leados_token');
      const res = await fetch(`${API_URL}/api/mafiya/reviews/posts?clientId=${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (activeClient) {
      fetchGmbPosts(activeClient.id);
    }
  }, [activeClient]);

  // Delete Post
  const handleDeletePost = async (id) => {
    if (!confirm('Are you sure you want to delete this GMB post record?')) return;
    try {
      const token = localStorage.getItem('leados_token');
      await axios.delete(`${API_URL}/api/mafiya/reviews/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
        toast.success('Post deleted');
        fetchGmbPosts(activeClient.id);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text }}>
        <div style={{ textAlign: 'center' }}>
          <Megaphone size={42} className="animate-pulse" style={{ color: C.accent, marginBottom: 12 }} />
          <p style={{ fontSize: 14 }}>Loading Street Posts dashboard...</p>
        </div>
      </div>
    );
  }

  const clientName = activeClient?.business_name || 'GMB Profile';
  const contactPhone = activeClient?.phone_number || '';



  return (
    <div className="p-mobile" style={{ padding: 26, overflowY: 'auto', height: '100%', background: C.bg, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 400, background: 'radial-gradient(circle at 50% -20%, rgba(249,115,22,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header toolbar */}
        <div className="flex-col-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 26 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>
                Street Posts <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(249,115,22,0.12)', color: C.accent, padding: '3px 8px', borderRadius: 20, marginLeft: 8 }}>GMB Posts</span>
              </h1>
            </div>
            <p style={{ color: C.muted, fontSize: 12.5, marginTop: 5 }}>
              8 posts/month · {posts.length} generated · {Math.max(0, 8 - posts.length)} remaining — Growth Plan · {clientName}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 450, justifyContent: 'flex-end' }} className="flex-col-mobile">
            <select 
              value={activeClient ? activeClient.id : ''} 
              onChange={(e) => {
                const c = clients.find(cl => cl.id === parseInt(e.target.value));
                if (c) setActiveClient(c);
              }} 
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, padding: '10px 14px', fontSize: 13, outline: 'none', cursor: 'pointer', flex: 1 }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.business_name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setShowModal(true);
              }}
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', border: 'none', borderRadius: 10, padding: '10px 18px', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.25)' }}
            >
              <Plus size={15} /> Upload Poster
            </button>
          </div>
        </div>

        {/* Existing posts grid */}
        {postsLoading ? (
          <div style={{ padding: 60, textAlign: 'center', color: C.muted }}>
            <Loader2 size={24} className="spin" style={{ color: C.accent, margin: '0 auto 10px auto' }} />
            Loading post history...
          </div>
        ) : posts.length === 0 ? (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '60px 20px', textAlign: 'center', color: C.muted }}>
            <Megaphone size={40} style={{ color: C.border, marginBottom: 14 }} />
            <h3 style={{ color: '#fff', fontSize: 15, margin: '0 0 4px 0' }}>No GMB Posts Yet</h3>
            <p style={{ fontSize: 12.5, margin: 0 }}>Click "Generate Post" above to create your first GMB Post.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
            {posts.map((post) => (
              <div 
                key={post.id} 
                style={{ 
                  background: C.surface, 
                  border: `1px solid ${C.border}`, 
                  borderRadius: 16, 
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Poster visual representation mock */}
                <div style={{ 
                  height: 200, 
                  backgroundImage: post.image_url ? `url(${post.image_url})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 100%)' }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{clientName.substring(0, 20)}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
                      {post.post_type}
                    </span>
                  </div>

                  <div style={{ textAlign: 'center', color: '#fff', position: 'relative', zIndex: 1 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 4px 0', letterSpacing: 0.5, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                      {post.poster_title || 'UPDATE'}
                    </h3>
                    <p style={{ fontSize: 12, color: '#e2e8f0', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                      {post.poster_subtitle || 'Contact us for details'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#f1f5f9', fontWeight: 600, position: 'relative', zIndex: 1 }}>
                    <span>📞 {activeClient?.phone_number}</span>
                    <span>Google Business</span>
                  </div>
                </div>

                {/* Caption / description */}
                <div style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 14px 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {post.caption}
                    </p>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                    <span style={{ fontSize: 11, color: post.status === 'published' ? C.green : C.muted, fontWeight: 600 }}>
                      • {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        onClick={() => handleDeletePost(post.id)}
                        style={{ background: `${C.red}12`, border: 'none', borderRadius: 6, padding: 6, color: C.red, display: 'flex', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ GMB Upload Post Modal ═══ */}
        <GmbPostModal activeClient={activeClient} fetchGmbPosts={fetchGmbPosts} showModal={showModal} setShowModal={setShowModal} />

      </div>
    </div>
  );
}
