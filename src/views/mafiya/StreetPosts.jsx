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
  const [repeats, setRepeats] = useState('Does not repeat');
  const [customDays, setCustomDays] = useState([]);
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
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

  useEffect(() => {
    setRepeats('Does not repeat');
  }, [startDate]);

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
    if (postType === 'Offer' || postType === 'Event') {
      const startDateTime = new Date(`${startDate}T${startTime || '00:00'}`);
      const endDateTime = new Date(`${endDate}T${endTime || '00:00'}`);
      if (startDateTime >= endDateTime) {
        toast.error('End date/time must be strictly after start date/time');
        return;
      }
    }
    if (postType !== 'Offer' && hasButton && buttonType !== 'None' && buttonType !== 'Call now') {
      if (!buttonLink) {
        toast.error('Button Link is required');
        return;
      }
      try {
        new URL(buttonLink);
      } catch (_) {
        toast.error('Please enter a valid URL (starting with http:// or https://) for the button link');
        return;
      }
    }
    if (schedulePost) {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Schedule Date and Time are required');
        return;
      }
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        toast.error('Scheduled date/time must be in the future');
        return;
      }
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
          status: schedulePost ? 'scheduled' : 'published',
          scheduledAt: schedulePost ? `${scheduledDate} ${scheduledTime}:00` : null,
          postTitle: postTitle,
          startDate: startDate || null,
          endDate: endDate || null,
          startTime: startTime || null,
          endTime: endTime || null,
          couponCode: couponCode || null,
          redeemLink: redeemLink || null,
          terms: terms || null,
          repeats: repeats,
          customDays: customDays.join(','),
          repeatEndDate: repeatEndDate || null
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success(schedulePost ? 'Post scheduled successfully!' : 'Published to GMB Successfully!');
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
        setRepeats('Does not repeat');
        setCustomDays([]);
        setRepeatEndDate('');
        setSchedulePost(false);
        setScheduledDate('');
        setScheduledTime('');
        setHasButton(false);
        setButtonType('None');
        setButtonLink('');
      
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };




  const getLocalDayAndOccurrence = (dateStr) => {
    if (!dateStr) return { dayName: 'Wednesday', occurrence: 'the first Wednesday' };
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    const dayNum = date.getDate();
    const index = Math.ceil(dayNum / 7);
    const ordinal = ['first', 'second', 'third', 'fourth', 'fifth'][index - 1] || 'first';
    return {
      dayName,
      occurrence: `the ${ordinal} ${dayName}`
    };
  };

  const { dayName, occurrence } = getLocalDayAndOccurrence(startDate);

  const toggleDay = (day) => {
    if (customDays.includes(day)) {
      setCustomDays(customDays.filter(d => d !== day));
    } else {
      setCustomDays([...customDays, day]);
    }
  };

  const clientName = activeClient?.business_name || 'GMB Profile';
  const contactPhone = activeClient?.phone_number || '';

  return (
    <>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 20 }}>
          <div style={{ background: '#18181b', width: '100%', maxWidth: 840, maxHeight: '90vh', borderRadius: 16, border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: 'rgba(249,115,22,0.1)', padding: 8, borderRadius: 8 }}>
                  <Megaphone size={20} color="#f97316" />
                </div>
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: '#f4f4f5', fontFamily: "'Syne', sans-serif" }}>Create GMB Post</h2>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <X size={18} color="#a1a1aa" />
              </button>
            </div>

            <div style={{ padding: '28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

              {!activeClient?.google_location_id ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px', textAlign: 'center' }}>
                  <div style={{ background: 'rgba(249,115,22,0.1)', padding: 20, borderRadius: '50%', marginBottom: 20, border: '1px solid rgba(249,115,22,0.2)' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  </div>
                  <h3 style={{ color: '#f4f4f5', fontSize: 20, fontWeight: 700, margin: '0 0 12px 0' }}>Connect Google Business Location</h3>
                  <p style={{ color: '#a1a1aa', fontSize: 14, maxWidth: 440, marginBottom: 28, lineHeight: 1.6 }}>
                    To publish posts directly to Google, please connect the specific business location for <strong style={{ color: '#fff' }}>{clientName}</strong>.
                  </p>
                  
                  {fetchingLocations ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#f97316' }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Fetching verified locations...</span>
                    </div>
                  ) : locations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 380 }}>
                      <select 
                        value={selectedLocationStr}
                        onChange={e => setSelectedLocationStr(e.target.value)}
                        style={{ background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', color: '#f4f4f5', padding: '14px 18px', borderRadius: 8, fontSize: 14, outline: 'none', cursor: 'pointer' }}
                      >
                        {locations.map((loc, i) => (
                          <option key={i} value={loc.accountId + '|' + loc.locationId}>{loc.title}</option>
                        ))}
                      </select>
                      <button 
                        onClick={handleSaveConnection}
                        disabled={saving}
                        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', padding: '14px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(249,115,22,0.3)', transition: 'all 0.2s' }}
                      >
                        {saving ? 'Connecting...' : 'Connect Location'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ background: 'rgba(239,68,68,0.06)', padding: 20, borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)', width: '100%', maxWidth: 460 }}>
                      <p style={{ color: '#ef4444', margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>
                        We couldn't find any locations in your Google Account. Please ensure you have connected an account that manages Google Business Profiles in the Local SEO Bridge.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Tabs */}
                  <div style={{ display: 'flex', gap: 10, background: '#27272a', padding: 6, borderRadius: 10, width: 'fit-content' }}>
                    {['Update', 'Offer', 'Event'].map(tab => {
                      const isActive = postType === tab;
                      return (
                        <button 
                          key={tab}
                          onClick={() => setPostType(tab)}
                          style={{ 
                            background: isActive ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'transparent', 
                            border: 'none',
                            color: isActive ? '#fff' : '#a1a1aa',
                            padding: '8px 20px',
                            borderRadius: 8,
                            fontSize: 13.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.2s',
                            boxShadow: isActive ? '0 4px 12px rgba(249,115,22,0.2)' : 'none'
                          }}
                        >
                          {isActive && <Check size={14} strokeWidth={3} />}
                          {tab}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 32 }}>
                    
                    {/* Left Column (Inputs) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      
                      {/* Dynamic Title for Offer & Event */}
                      {(postType === 'Offer' || postType === 'Event') && (
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="text"
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value.slice(0, 58))}
                            placeholder="Title*"
                            style={{ 
                              width: '100%',
                              background: '#27272a', 
                              border: '1px solid rgba(255,255,255,0.12)', 
                              borderRadius: 8, 
                              padding: '16px 16px 20px 16px', 
                              color: '#fff', 
                              fontSize: 14, 
                              outline: 'none',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#f97316'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                          />
                          <div style={{ position: 'absolute', bottom: 6, right: 12, fontSize: 10, color: '#71717a' }}>
                            {postTitle.length}/58
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      <div style={{ position: 'relative' }}>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value.slice(0, 1500))}
                          placeholder="What's new? (Description)*"
                          style={{ 
                            width: '100%', 
                            height: 120, 
                            background: '#27272a', 
                            border: '1px solid rgba(255,255,255,0.12)', 
                            borderRadius: 8, 
                            padding: '16px 16px 24px 16px', 
                            color: '#fff', 
                            fontSize: 14, 
                            outline: 'none', 
                            resize: 'none',
                            boxSizing: 'border-box',
                            lineHeight: 1.5,
                            transition: 'border-color 0.2s'
                          }}
                          onFocus={e => e.target.style.borderColor = '#f97316'}
                          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
                        />
                        <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: '#71717a' }}>
                          {description.length}/1,500
                        </div>
                      </div>

                      {/* Date and Time Fields for Offer / Event */}
                      {(postType === 'Offer' || postType === 'Event') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#27272a4d', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ position: 'relative' }}>
                              <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>Start Date*</label>
                              <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }}
                              />
                            </div>
                            <div style={{ position: 'relative' }}>
                              <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>Start Time</label>
                              <input 
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div style={{ position: 'relative' }}>
                              <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>End Date*</label>
                              <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }}
                              />
                            </div>
                            <div style={{ position: 'relative' }}>
                              <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>End Time</label>
                              <input 
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }}
                              />
                            </div>
                          </div>

                          {/* Repeats Cadence */}
                          <div style={{ position: 'relative' }}>
                            <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>Repeats</label>
                            <select 
                              value={repeats}
                              onChange={(e) => setRepeats(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none', cursor: 'pointer' }}
                            >
                              <option value="Does not repeat" style={{background: '#202124'}}>Does not repeat</option>
                              <option value="Daily" style={{background: '#202124'}}>Daily</option>
                              <option value={`Weekly on ${dayName}`} style={{background: '#202124'}}>{`Weekly on ${dayName}`}</option>
                              <option value="Custom weekly" style={{background: '#202124'}}>Custom weekly</option>
                              <option value={`Monthly on ${occurrence}`} style={{background: '#202124'}}>{`Monthly on ${occurrence}`}</option>
                            </select>
                          </div>

                          {/* Custom Repeat Days */}
                          {repeats === 'Custom weekly' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4, background: '#1e1e21', padding: 14, borderRadius: 8 }}>
                              <label style={{ fontSize: 12, color: '#a1a1aa', fontWeight: 600 }}>Select days that the post repeats on</label>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                                  const isSelected = customDays.includes(day);
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => toggleDay(day)}
                                      style={{
                                        background: isSelected ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.05)',
                                        border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                        color: isSelected ? '#fff' : '#a1a1aa',
                                        padding: '6px 12px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      {day}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              <div style={{ position: 'relative', marginTop: 8 }}>
                                <label style={{ fontSize: 11, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>Repeating post will end on</label>
                                <input 
                                  type="date"
                                  value={repeatEndDate}
                                  onChange={(e) => setRepeatEndDate(e.target.value)}
                                  style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Schedule switch */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#27272a4d', padding: '14px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <span style={{ fontSize: 14.5, color: '#fff', fontWeight: 600, display: 'block' }}>Schedule this post</span>
                          <span style={{ fontSize: 11.5, color: '#71717a' }}>Publish at a customized future date</span>
                        </div>
                        <div 
                          onClick={() => setSchedulePost(!schedulePost)}
                          style={{ 
                            width: 40, height: 22, 
                            background: schedulePost ? '#f97316' : '#3f3f46', 
                            borderRadius: 100, 
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ 
                            width: 16, height: 16, 
                            background: '#fff', 
                            borderRadius: '50%',
                            position: 'absolute',
                            top: 3, left: schedulePost ? 21 : 3,
                            transition: 'left 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }} />
                        </div>
                      </div>

                      {schedulePost && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, background: '#27272a4d', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', marginTop: -8 }}>
                          <div>
                            <label style={{ fontSize: 11.5, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>Schedule Date*</label>
                            <input 
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => setScheduledDate(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11.5, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>Schedule Time*</label>
                            <input 
                              type="time"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Add more details (Buttons/Offers specific) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#27272a4d', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)' }}>
                        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: '#fff' }}>Add more details</h3>
                        
                        {postType === 'Offer' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              <button onClick={() => setShowTerms(!showTerms)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: showTerms ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showTerms ? '#f97316' : 'rgba(255,255,255,0.1)'}`, borderRadius: 20, padding: '6px 14px', color: showTerms ? '#f97316' : '#a1a1aa', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                {showTerms ? <X size={13}/> : <Plus size={13}/>} Terms
                              </button>
                              <button onClick={() => setShowCoupon(!showCoupon)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: showCoupon ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showCoupon ? '#f97316' : 'rgba(255,255,255,0.1)'}`, borderRadius: 20, padding: '6px 14px', color: showCoupon ? '#f97316' : '#a1a1aa', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                {showCoupon ? <X size={13}/> : <Plus size={13}/>} Coupon code
                              </button>
                              <button onClick={() => setShowRedeem(!showRedeem)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: showRedeem ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showRedeem ? '#f97316' : 'rgba(255,255,255,0.1)'}`, borderRadius: 20, padding: '6px 14px', color: showRedeem ? '#f97316' : '#a1a1aa', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                                {showRedeem ? <X size={13}/> : <Plus size={13}/>} Link to redeem
                              </button>
                            </div>

                            {showTerms && (
                              <input type="text" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Terms and conditions" style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }} />
                            )}
                            {showCoupon && (
                              <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Coupon code" style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }} />
                            )}
                            {showRedeem && (
                              <input type="url" value={redeemLink} onChange={e => setRedeemLink(e.target.value)} placeholder="Link to redeem offer (e.g. https://yourstore.com/offer)" style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }} />
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <button 
                              onClick={() => { setHasButton(!hasButton); if(!hasButton) setButtonType('Call now'); }}
                              style={{ 
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                background: hasButton ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.04)', 
                                border: `1px solid ${hasButton ? '#f97316' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: 20, padding: '6px 14px', 
                                color: hasButton ? '#f97316' : '#a1a1aa', 
                                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                                alignSelf: 'flex-start',
                                transition: 'all 0.2s'
                              }}
                            >
                              {hasButton ? <X size={13}/> : <Plus size={13}/>} Action Button
                            </button>
                            
                            {hasButton && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: '#1e1e21', padding: 16, borderRadius: 8 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <label style={{ fontSize: 12, color: '#a1a1aa' }}>Select Button Type</label>
                                  <select 
                                    value={buttonType}
                                    onChange={(e) => setButtonType(e.target.value)}
                                    style={{
                                      background: '#27272a',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: 6,
                                      padding: '12px 14px',
                                      color: '#fff',
                                      fontSize: 13.5,
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
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 11.5, color: '#a1a1aa' }}>Connected Number</label>
                                    <div style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5 }}>
                                      {contactPhone || 'No phone number available'}
                                    </div>
                                    <span style={{ fontSize: 11, color: '#71717a' }}>Customers will call this number directly from Google.</span>
                                  </div>
                                ) : buttonType !== 'None' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <label style={{ fontSize: 11.5, color: '#a1a1aa' }}>Button Link Destination*</label>
                                    <input 
                                      type="url"
                                      value={buttonLink}
                                      onChange={(e) => setButtonLink(e.target.value)}
                                      placeholder="https://example.com/link"
                                      style={{ width: '100%', boxSizing: 'border-box', background: '#27272a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '12px 14px', color: '#fff', fontSize: 13.5, outline: 'none' }}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Right Column (Image/Media Upload) */}
                    <div style={{ width: '100%' }}>
                      <div style={{ position: 'sticky', top: 0, width: '100%' }}>
                        <label style={{ fontSize: 13.5, color: '#a1a1aa', display: 'block', marginBottom: 8, fontWeight: 600 }}>Media (Image / Video)</label>
                        <label style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          height: 240,
                          width: '100%',
                          boxSizing: 'border-box',
                          border: '2px dashed rgba(255,255,255,0.15)',
                          borderRadius: 12,
                          background: 'rgba(255,255,255,0.02)',
                          cursor: 'pointer',
                          overflow: 'hidden',
                          position: 'relative',
                          transition: 'all 0.2s'
                        }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#f97316'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                        >
                          {selectedImage ? (
                            <>
                              {selectedImage.startsWith('data:video/') ? (
                                <video src={selectedImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls />
                              ) : (
                                <img src={selectedImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              )}
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                                <span style={{ color: '#fff', fontSize: 13, fontWeight: 600, background: '#f97316', padding: '6px 14px', borderRadius: 6 }}>Change Media</span>
                              </div>
                            </>
                          ) : (
                            <div style={{ textAlign: 'center', padding: 20 }}>
                              <div style={{ background: 'rgba(249,115,22,0.08)', padding: 12, borderRadius: '50%', width: 'fit-content', margin: '0 auto 16px auto' }}>
                                <ImagePlus size={24} color="#f97316" />
                              </div>
                              <span style={{ color: '#f4f4f5', fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 4 }}>Drag visual media here</span>
                              <span style={{ color: '#71717a', fontSize: 12, display: 'block', marginBottom: 12 }}>PNG, JPG, or MP4 formats</span>
                              <span style={{ color: '#f97316', fontSize: 13, fontWeight: 700 }}>Browse Files</span>
                            </div>
                          )}
                          <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 28px', display: 'flex', justifyContent: 'flex-end', gap: 12, borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#1c1c1f' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ 
                  background: 'transparent', 
                  color: '#a1a1aa', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: 8, 
                  padding: '10px 22px', 
                  fontSize: 13.5, 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#a1a1aa'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePost}
                disabled={saving || !description}
                style={{ 
                  background: (saving || !description) ? '#27272a' : 'linear-gradient(135deg, #f97316, #ea580c)', 
                  color: (saving || !description) ? '#71717a' : '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  padding: '10px 24px', 
                  fontSize: 13.5, 
                  fontWeight: 700, 
                  cursor: (saving || !description) ? 'not-allowed' : 'pointer',
                  opacity: (saving || !description) ? 0.6 : 1,
                  boxShadow: (saving || !description) ? 'none' : '0 4px 14px rgba(249,115,22,0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { if(!saving && description) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { if(!saving && description) e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {saving ? 'Publishing...' : 'Publish Post'}
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

          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 500, justifyContent: 'flex-end', alignItems: 'center' }} className="flex-col-mobile">
            <select 
              value={activeClient ? activeClient.id : ''} 
              onChange={(e) => {
                const c = clients.find(cl => cl.id === parseInt(e.target.value));
                if (c) setActiveClient(c);
              }} 
              style={{ 
                background: C.card, 
                border: `1px solid ${C.border}`, 
                borderRadius: 10, 
                color: C.text, 
                padding: '10px 14px', 
                fontSize: 13, 
                outline: 'none', 
                cursor: 'pointer', 
                flex: 1,
                maxWidth: '320px',
                width: '100%',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.business_name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setShowModal(true);
              }}
              style={{ 
                background: 'linear-gradient(135deg,#f97316,#ea580c)', 
                border: 'none', 
                borderRadius: 10, 
                padding: '10px 18px', 
                color: '#fff', 
                fontSize: 13, 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                cursor: 'pointer', 
                boxShadow: '0 4px 14px rgba(249,115,22,0.25)',
                whiteSpace: 'nowrap'
              }}
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
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {post.image_url ? (
                    (post.image_url.endsWith('.mp4') || post.image_url.endsWith('.webm') || post.image_url.endsWith('.mov') || post.image_url.endsWith('.avi')) ? (
                      <video src={post.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, zIndex: 0 }} muted loop playsInline />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${post.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0 }} />
                    )
                  ) : null}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 100%)', zIndex: 0 }} />
                  
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
