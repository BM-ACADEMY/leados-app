const fs = require('fs');
const file = 'src/views/mafiya/StreetPosts.jsx';
const content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('{/* Left Column */}');
const endIndex = content.indexOf('{/* Footer */}');

if (startIndex !== -1 && endIndex !== -1) {
  const newUI = `{/* Left Column */}
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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              placeholder="Start date*"
                              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                            {!startDate && <span style={{ position: 'absolute', left: 12, top: 16, color: '#9aa0a6', pointerEvents: 'none', fontSize: 14 }}>Start date*</span>}
                          </div>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type="time"
                              value={startTime}
                              onChange={(e) => setStartTime(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                            {!startTime && <span style={{ position: 'absolute', left: 12, top: 16, color: '#9aa0a6', pointerEvents: 'none', fontSize: 14 }}>Start time</span>}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                            {!endDate && <span style={{ position: 'absolute', left: 12, top: 16, color: '#9aa0a6', pointerEvents: 'none', fontSize: 14 }}>End Date*</span>}
                          </div>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type="time"
                              value={endTime}
                              onChange={(e) => setEndTime(e.target.value)}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: '1px solid #5f6368', borderRadius: 4, padding: '16px 12px', color: '#e8eaed', fontSize: 14, outline: 'none' }}
                            />
                            {!endTime && <span style={{ position: 'absolute', left: 12, top: 16, color: '#9aa0a6', pointerEvents: 'none', fontSize: 14 }}>End time</span>}
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
                          <button onClick={() => setShowTerms(!showTerms)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: showTerms ? 'rgba(138,180,248,0.1)' : 'transparent', border: \`1px solid \${showTerms ? '#8ab4f8' : '#5f6368'}\`, borderRadius: 16, padding: '6px 14px', color: showTerms ? '#8ab4f8' : '#e8eaed', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                            {showTerms ? <X size={14}/> : <Plus size={14}/>} Terms
                          </button>
                          <button onClick={() => setShowCoupon(!showCoupon)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: showCoupon ? 'rgba(138,180,248,0.1)' : 'transparent', border: \`1px solid \${showCoupon ? '#8ab4f8' : '#5f6368'}\`, borderRadius: 16, padding: '6px 14px', color: showCoupon ? '#8ab4f8' : '#e8eaed', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                            {showCoupon ? <X size={14}/> : <Plus size={14}/>} Coupon code
                          </button>
                          <button onClick={() => setShowRedeem(!showRedeem)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: showRedeem ? 'rgba(138,180,248,0.1)' : 'transparent', border: \`1px solid \${showRedeem ? '#8ab4f8' : '#5f6368'}\`, borderRadius: 16, padding: '6px 14px', color: showRedeem ? '#8ab4f8' : '#e8eaed', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
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
                              border: \`1px solid \${hasButton ? '#8ab4f8' : '#5f6368'}\`,
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

              </div>

              `;

  const newContent = content.substring(0, startIndex) + newUI + content.substring(endIndex);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Successfully refined UI layout');
} else {
  console.log('Could not find start or end index for modal replacement');
}
