const fs = require('fs');
const file = 'src/views/mafiya/StreetPosts.jsx';
const content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('{/* Left Column */}');
const endIndex = content.indexOf('{/* Footer */}');

if (startIndex !== -1 && endIndex !== -1) {
  const newUI = `{/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    
                    {/* Dynamic Fields for Offer & Event */}
                    {(postType === 'Offer' || postType === 'Event') && (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <label style={{ fontSize: 13, color: '#9aa0a6' }}>{postType} title (Required)</label>
                          <input 
                            type="text"
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            placeholder={postType === 'Offer' ? "e.g. 20% off in-store" : "Event title"}
                            style={{ background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                          />
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 13, color: '#9aa0a6' }}>Start date</label>
                            <input 
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              style={{ background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 13, color: '#9aa0a6' }}>End date</label>
                            <input 
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              style={{ background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                          </div>
                        </div>

                        {postType === 'Event' && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <label style={{ fontSize: 13, color: '#9aa0a6' }}>Start time (optional)</label>
                              <input 
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                style={{ background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <label style={{ fontSize: 13, color: '#9aa0a6' }}>End time (optional)</label>
                              <input 
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                style={{ background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 1500))}
                        placeholder={postType === 'Offer' ? "Offer details (optional)" : postType === 'Event' ? "Event details (optional)" : "Description"}
                        style={{ 
                          width: '100%', 
                          height: 140, 
                          background: 'transparent', 
                          border: '1px solid #5f6368', 
                          borderRadius: 4, 
                          padding: '12px', 
                          color: '#e8eaed', 
                          fontSize: 14, 
                          outline: 'none', 
                          resize: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                      <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, color: '#9aa0a6' }}>
                        {description.length}/1,500
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 15, color: '#e8eaed', fontWeight: 500 }}>Schedule this post</span>
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
                  </div>

                  {/* Right Column */}
                  <div>
                    <label style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      height: 180,
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
                          <span style={{ color: '#e8eaed', fontSize: 15, fontWeight: 500, display: 'block', marginBottom: 20 }}>Drag images and videos here</span>
                          <span style={{ color: '#9aa0a6', fontSize: 13, display: 'block', marginBottom: 20 }}>or</span>
                          <span style={{ color: '#8ab4f8', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <ImagePlus size={18} /> Select images and videos
                          </span>
                        </div>
                      )}
                      <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <div style={{ height: 1, background: '#3c4043', margin: '24px 0' }} />

                {/* Add more details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#e8eaed' }}>Add more details</h3>
                  
                  {postType === 'Offer' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 13, color: '#9aa0a6' }}>Coupon code (optional)</label>
                        <input 
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          style={{ background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 13, color: '#9aa0a6' }}>Link to redeem offer (optional)</label>
                        <input 
                          type="url"
                          value={redeemLink}
                          onChange={(e) => setRedeemLink(e.target.value)}
                          style={{ background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 13, color: '#9aa0a6' }}>Terms and conditions (optional)</label>
                        <input 
                          type="text"
                          value={terms}
                          onChange={(e) => setTerms(e.target.value)}
                          style={{ background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {!hasButton ? (
                        <button 
                          onClick={() => { setHasButton(true); setButtonType('Learn more'); }}
                          style={{ 
                            background: 'transparent', 
                            border: '1px solid #5f6368',
                            color: '#8ab4f8',
                            padding: '6px 16px',
                            borderRadius: 16,
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            alignSelf: 'flex-start',
                            fontWeight: 500
                          }}
                        >
                          <Plus size={16} /> Button
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 13, color: '#9aa0a6' }}>Button (optional)</label>
                            <select 
                              value={buttonType}
                              onChange={(e) => {
                                setButtonType(e.target.value);
                                if (e.target.value === 'None') setHasButton(false);
                              }}
                              style={{
                                background: 'transparent',
                                border: '1px solid #5f6368',
                                borderRadius: 4,
                                padding: '12px',
                                color: '#e8eaed',
                                fontSize: 14,
                                outline: 'none',
                                cursor: 'pointer'
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
                          
                          {buttonType === 'Call now' && (
                            <div style={{ fontSize: 13, color: '#9aa0a6', background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 6, borderLeft: '3px solid #8ab4f8' }}>
                              Your primary phone number from your GMB profile <strong style={{color: '#e8eaed'}}>{contactPhone}</strong> will appear on this button.
                            </div>
                          )}

                          {buttonType !== 'None' && buttonType !== 'Call now' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <label style={{ fontSize: 13, color: '#9aa0a6' }}>Link for your button</label>
                              <input 
                                type="url"
                                value={buttonLink}
                                onChange={(e) => setButtonLink(e.target.value)}
                                placeholder="Link for your button"
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #5f6368',
                                  borderRadius: 4,
                                  padding: '12px',
                                  color: '#e8eaed',
                                  fontSize: 14,
                                  outline: 'none',
                                  width: '100%',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              `;

  const newContent = content.substring(0, startIndex) + newUI + content.substring(endIndex);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Successfully updated UI');
} else {
  console.log('Could not find start or end index for modal replacement');
}
