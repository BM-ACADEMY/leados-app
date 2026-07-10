const fs = require('fs');
const file = 'src/views/mafiya/StreetPosts.jsx';
const content = fs.readFileSync(file, 'utf8');

const startIndex = content.indexOf('{/* ═══ AI Post Generation Modal ═══ */}');
const endIndex = content.indexOf('      </div>\n    </div>\n  );\n}');

if (startIndex !== -1 && endIndex !== -1) {
  const newModal = `        {/* ═══ GMB Upload Post Modal ═══ */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: 20 }}>
            <div style={{ background: '#202124', width: '100%', maxWidth: 760, borderRadius: 8, overflow: 'hidden', boxShadow: '0 24px 38px 3px rgba(0,0,0,0.14)', display: 'flex', flexDirection: 'column' }}>
              
              {/* Header */}
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #3c4043' }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500, color: '#e8eaed' }}>Add post</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <MoreVertical size={20} color="#9aa0a6" style={{ cursor: 'pointer' }} />
                  <X size={24} color="#9aa0a6" style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
                </div>
              </div>

              <div style={{ padding: '24px' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  {['Update', 'Offer', 'Event'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setPostType(tab)}
                      style={{ 
                        background: postType === tab ? '#3a3f4b' : 'transparent', 
                        border: \`1px solid \${postType === tab ? '#8ab4f8' : '#5f6368'}\`,
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ position: 'relative' }}>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 1500))}
                        placeholder="Description"
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
                  <button 
                    onClick={() => setHasButton(!hasButton)}
                    style={{ 
                      background: hasButton ? '#3a3f4b' : 'transparent', 
                      border: \`1px solid \${hasButton ? '#8ab4f8' : '#5f6368'}\`,
                      color: hasButton ? '#8ab4f8' : '#e8eaed',
                      padding: '6px 16px',
                      borderRadius: 16,
                      fontSize: 14,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      alignSelf: 'flex-start'
                    }}
                  >
                    <Plus size={16} /> Button
                  </button>
                </div>
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
        )

`;

  const newContent = content.substring(0, startIndex) + newModal + content.substring(endIndex);
  fs.writeFileSync(file, newContent, 'utf8');
  console.log('Successfully replaced modal UI');
} else {
  console.log('Could not find start or end index for modal replacement');
}
