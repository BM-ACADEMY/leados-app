import { useState, useEffect } from "react";

// ── MOCK DATA — replace with real API calls to app.abmgroups.org/api ──
const MOCK_ITEMS = [
  {
    id: 1, brand: "bm_academy", file_name: "academy_reel_001.mp4",
    thumbnail_url: null,
    caption: `🎓 3 maadham training, lifetime career!\n\nBM Academy la join pannunga — Tamil Nadu la #1 Digital Marketing course.\n\n✅ 1400+ trained\n✅ 150+ placed\n✅ 20% refund guarantee if not placed\n\nJuly 2026 batch — seats almost full!\n\nComment LEARN to get your free course guide 👇\n\n#BMacademy #LearnWithKamar #DigitalMarketingTamil #JobsInPondicherry #DMCourse`,
    x_caption: "3 maadham training, lifetime career. 150+ placed from BM Academy. July batch — last seats. Comment LEARN 👇 #BMacademy #LearnWithKamar",
    linkedin_caption: `BM Academy has placed 150+ students in digital marketing roles across Tamil Nadu and Pondicherry in the last 12 months.\n\nOur 3-month AI-Powered Digital Marketing program combines hands-on training with guaranteed placement support.\n\nFor students serious about a career in digital marketing — applications for the July 2026 batch are now open.\n\nWhat's the biggest challenge you faced when starting your career? #DigitalMarketing #CareerGrowth #BMAcademy`,
    thumbnail_title: "3 Maadham Training Lifetime Career",
    story_1: "Digital Marketing job cheyyanuma? 🤔",
    story_2: "1400+ students trained. 150+ placed ✅",
    story_3: "Comment LEARN now 👇 July batch filling fast!",
    platforms: ["instagram", "youtube", "facebook", "x_twitter", "linkedin"],
    scheduled_at: "2026-06-10T19:30:00+05:30",
    status: "PENDING", created_at: "2026-06-09T14:22:00+05:30"
  },
  {
    id: 2, brand: "bm_techx", file_name: "techx_gmb_reel.mp4",
    thumbnail_url: null,
    caption: `Your competitor already has 500 Google reviews. You have 12. 📉\n\nThat gap costs you customers every single day.\n\nBM TechX's GMB Mafia service:\n→ Optimise your Google listing\n→ Rank #1 in local search\n→ Get reviews on autopilot\n\nWe grew a Pondicherry clinic 3x in 90 days.\n\nDM GROW for a free audit 👇\n\n#BMTechX #GrowWithKamar #GoogleMyBusiness #LocalBusinessTN`,
    x_caption: "Your competitor has 500 Google reviews. You have 12. That gap costs customers daily. DM GROW for free audit. #GrowWithKamar #GMB",
    linkedin_caption: `Local search visibility is the most underutilised growth lever for small businesses in Tamil Nadu.\n\nWe recently helped a Pondicherry dental clinic go from page 3 to the #1 Google Maps result in 90 days — resulting in a 3x increase in appointment bookings.\n\nThe process: Google Business Profile optimisation, structured review generation, and consistent local citation building.\n\nAre you tracking where your business ranks on Google Maps for your core service? #LocalSEO #DigitalMarketing #SmallBusiness`,
    thumbnail_title: "500 vs 12 Google Reviews",
    story_1: "Competitor ku 500 reviews. Ungalukku 12. 😬",
    story_2: "GMB Mafia — Local SEO automation for TN businesses",
    story_3: "DM GROW for free audit today 👇",
    platforms: ["instagram", "facebook", "x_twitter", "linkedin"],
    scheduled_at: "2026-06-10T10:30:00+05:30",
    status: "PENDING", created_at: "2026-06-09T11:10:00+05:30"
  },
  {
    id: 3, brand: "npp", file_name: "npp_plot_walkthrough.mp4",
    thumbnail_url: null,
    caption: `Only 4 plots remaining in Phase 1. 🏡\n\nMarakkanam — Chennai-Pondicherry Growth Corridor\n📐 6,000+ sq.ft plots\n💰 ₹999/sq.ft only\n🛣️ ECR Highway access\n\nPrice revision confirmed next month. Lock today's rate.\n\nComment PLOT for full details and site visit booking 👇\n\n#NammaPondyProperties #ChennaiPondyGrowthCorridor #LandInvestmentTN #MarakkanamPlots`,
    x_caption: "Only 4 plots left — Marakkanam, Chennai-Pondicherry Corridor. ₹999/sq.ft. Price revision next month. Comment PLOT for details. #PondicherryPlots",
    linkedin_caption: `The Chennai-Pondicherry Growth Corridor is seeing significant infrastructure investment in 2026 — ECR widening, new industrial zones, and improved rail connectivity.\n\nFor investors considering land acquisition in this corridor, current pricing at Marakkanam represents strong value before the next appreciation cycle.\n\n6,000+ sq.ft plots available at ₹999/sq.ft with clear title documentation.\n\nWhat factors do you prioritise when evaluating land investment in Tamil Nadu? #RealEstate #LandInvestment #TamilNadu`,
    thumbnail_title: "Only 4 Plots Left Phase 1",
    story_1: "Chennai-Pondicherry Corridor — the next growth zone 📈",
    story_2: "6000 sq.ft at ₹999/sq.ft — Phase 1 almost sold",
    story_3: "Comment PLOT for site visit booking 👇",
    platforms: ["instagram", "facebook", "x_twitter", "linkedin"],
    scheduled_at: "2026-06-11T09:30:00+05:30",
    status: "PENDING", created_at: "2026-06-09T09:45:00+05:30"
  },
  {
    id: 4, brand: "dadas_kitchen", file_name: "biriyani_reel_firewood.mp4",
    thumbnail_url: null,
    caption: `Firewood-cooked biriyani — taste the difference 🔥\n\nDada's Kitchen — Pondicherry's favourite for bulk orders and events.\n\n50 plates or 500 plates — same quality guaranteed.\n\nWedding season booking now open!\n\n📞 DM ORDER for bulk pricing\n🍽️ Comment WEDDING for event menu\n\n#DadasKitchen #PondicherryFood #FirewoodCooking #BulkOrders #WeddingCatering`,
    x_caption: "Firewood-cooked biriyani. 50 plates or 500 — same quality. Wedding season booking open. DM ORDER 🔥 #PondicherryFood #FirewoodCooking",
    linkedin_caption: `Dada's Kitchen specialises in large-scale traditional firewood cooking for corporate events, weddings, and institutional catering across Pondicherry.\n\nCapacity: 50 to 500+ covers per event. Consistent quality across scale is our core commitment.\n\nCurrently accepting bookings for Q3 2026 corporate and wedding events.\n\nLooking for reliable catering partners for your next corporate event in Pondicherry? #CorporateCatering #EventManagement #Pondicherry`,
    thumbnail_title: "Firewood Biriyani Wedding Season Open",
    story_1: "Real firewood cooking = real taste 🔥",
    story_2: "50 to 500 plates — Dada's Kitchen handles it all",
    story_3: "Comment WEDDING to book your event 👇",
    platforms: ["instagram", "facebook", "x_twitter"],
    scheduled_at: "2026-06-10T11:00:00+05:30",
    status: "PENDING", created_at: "2026-06-09T08:30:00+05:30"
  }
];

const BRAND_CONFIG = {
  bm_academy:    { name: "BM Academy",    color: "#7C3AED", bg: "#F5F3FF", short: "BMA" },
  bm_techx:      { name: "BM TechX",      color: "#06B6D4", bg: "#ECFEFF", short: "TechX" },
  npp:           { name: "NPP",           color: "#10B981", bg: "#ECFDF5", short: "NPP" },
  dadas_kitchen: { name: "Dada's Kitchen", color: "#F59E0B", bg: "#FFFBEB", short: "Dada's" },
};

const PLATFORM_CONFIG = {
  instagram:  { label: "Instagram", icon: "📸", color: "#E1306C" },
  youtube:    { label: "YouTube",   icon: "▶️", color: "#FF0000" },
  facebook:   { label: "Facebook",  icon: "👍", color: "#1877F2" },
  x_twitter:  { label: "X",         icon: "𝕏", color: "#000000" },
  linkedin:   { label: "LinkedIn",  icon: "in", color: "#0A66C2" },
};

const CAPTION_TABS = [
  { key: "caption",          label: "Instagram / Facebook", icon: "📸" },
  { key: "x_caption",        label: "X (Twitter)",          icon: "𝕏" },
  { key: "linkedin_caption", label: "LinkedIn",             icon: "in" },
  { key: "thumbnail_title",  label: "YT Title",             icon: "▶️" },
];

export default function ApprovalDashboard() {
  const [items, setItems] = useState(MOCK_ITEMS);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("caption");
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [filter, setFilter] = useState("PENDING");
  const [toast, setToast] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const filtered = items.filter(i => filter === "ALL" ? true : i.status === filter);
  const pendingCount = items.filter(i => i.status === "PENDING").length;

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openItem(item) {
    setSelected(item);
    setTab("caption");
    setEditMode(false);
    setEditValues({
      caption: item.caption,
      x_caption: item.x_caption,
      linkedin_caption: item.linkedin_caption,
      thumbnail_title: item.thumbnail_title,
      scheduled_at: item.scheduled_at,
      platforms: [...item.platforms],
    });
  }

  function handleApprove(id) {
    // In production: POST /api/content/{id}/approve
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "APPROVED" } : i));
    setSelected(null);
    showToast("Content approved — publishing queue updated ✅");
  }

  function handleReject(id) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: "REJECTED" } : i));
    setSelected(null);
    showToast("Content rejected", "error");
    setConfirmAction(null);
  }

  function handleSaveEdit(id) {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, ...editValues } : i
    ));
    if (selected?.id === id) setSelected(prev => ({ ...prev, ...editValues }));
    setEditMode(false);
    showToast("Changes saved");
  }

  function togglePlatform(p) {
    setEditValues(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p]
    }));
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
    });
  }

  const brandConf = selected ? BRAND_CONFIG[selected.brand] : null;

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", background: "#F8F7FF", minHeight: "100vh", color: "#1A1A2E" }}>

      {/* ── TOPBAR ── */}
      <div style={{ background: "#0A0A0F", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#E8E8F0", letterSpacing: "-0.3px" }}>
            ABM Groups <span style={{ color: "#7C3AED" }}>· Content OS</span>
          </div>
          <div style={{ background: "#7C3AED22", border: "1px solid #7C3AED44", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "#A78BFA", fontWeight: 600 }}>
            Approval Dashboard
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {pendingCount > 0 && (
            <div style={{ background: "#EF444420", border: "1px solid #EF444444", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#EF4444", fontWeight: 700 }}>
              {pendingCount} pending
            </div>
          )}
          <div style={{ fontSize: 12, color: "#6B6B80" }}>app.abmgroups.org</div>
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>

        {/* ── LEFT PANEL — CONTENT LIST ── */}
        <div style={{ width: 340, flexShrink: 0, background: "#fff", borderRight: "1px solid #E5E4F0", overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Filter tabs */}
          <div style={{ padding: "16px 16px 0", borderBottom: "1px solid #E5E4F0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6B6B80", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Content Queue</div>
            <div style={{ display: "flex", gap: 4, marginBottom: -1 }}>
              {["PENDING","APPROVED","REJECTED","ALL"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "6px 12px", fontSize: 12, fontWeight: 600,
                  background: filter === f ? "#7C3AED" : "transparent",
                  color: filter === f ? "#fff" : "#6B6B80",
                  border: "none", borderRadius: "6px 6px 0 0",
                  cursor: "pointer", transition: "all 0.15s"
                }}>{f}</button>
              ))}
            </div>
          </div>

          {/* Items */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: "#6B6B80", fontSize: 13 }}>
                No {filter.toLowerCase()} items
              </div>
            )}
            {filtered.map(item => {
              const bc = BRAND_CONFIG[item.brand];
              const isActive = selected?.id === item.id;
              return (
                <div key={item.id} onClick={() => openItem(item)} style={{
                  padding: "14px 16px", cursor: "pointer", borderBottom: "1px solid #F0EFF8",
                  background: isActive ? "#F5F3FF" : "transparent",
                  borderLeft: isActive ? `3px solid ${bc.color}` : "3px solid transparent",
                  transition: "all 0.15s"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ background: bc.bg, border: `1px solid ${bc.color}33`, borderRadius: 5, padding: "2px 7px", fontSize: 10, fontWeight: 700, color: bc.color }}>
                        {bc.short}
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div style={{ fontSize: 10, color: "#9CA3AF" }}>{formatTime(item.created_at)}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.thumbnail_title}
                  </div>
                  <div style={{ fontSize: 11, color: "#6B6B80", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.file_name}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {item.platforms.map(p => (
                      <span key={p} style={{ fontSize: 10, padding: "1px 6px", background: "#F0EFF8", borderRadius: 4, color: "#6B6B80" }}>
                        {PLATFORM_CONFIG[p]?.icon} {PLATFORM_CONFIG[p]?.label}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── MAIN PANEL — DETAIL VIEW ── */}
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "#6B6B80" }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#1A1A2E" }}>Select a content item to review</div>
            <div style={{ fontSize: 13 }}>{pendingCount} items waiting for approval</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

            {/* Item header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ background: brandConf.bg, border: `1px solid ${brandConf.color}44`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: brandConf.color }}>
                    {brandConf.name}
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1A1A2E", letterSpacing: "-0.3px", marginBottom: 4 }}>
                  {selected.thumbnail_title}
                </div>
                <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                  {selected.file_name} · Uploaded {formatTime(selected.created_at)}
                </div>
              </div>
              {selected.status === "PENDING" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setEditMode(!editMode)} style={{
                    padding: "8px 16px", borderRadius: 8, border: "1px solid #E5E4F0",
                    background: editMode ? "#F5F3FF" : "#fff", color: editMode ? "#7C3AED" : "#1A1A2E",
                    fontWeight: 600, fontSize: 13, cursor: "pointer"
                  }}>
                    {editMode ? "✏️ Editing" : "✏️ Edit"}
                  </button>
                  {editMode && (
                    <button onClick={() => handleSaveEdit(selected.id)} style={{
                      padding: "8px 16px", borderRadius: 8, border: "none",
                      background: "#06B6D4", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer"
                    }}>Save Changes</button>
                  )}
                  <button onClick={() => setConfirmAction({ type: "reject", id: selected.id })} style={{
                    padding: "8px 16px", borderRadius: 8, border: "1px solid #EF444444",
                    background: "#FEF2F2", color: "#EF4444", fontWeight: 600, fontSize: 13, cursor: "pointer"
                  }}>✕ Reject</button>
                  <button onClick={() => handleApprove(selected.id)} style={{
                    padding: "8px 20px", borderRadius: 8, border: "none",
                    background: "#10B981", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    boxShadow: "0 2px 8px #10B98133"
                  }}>✓ Approve</button>
                </div>
              )}
            </div>

            {/* Two column layout */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

              {/* LEFT — Captions */}
              <div>
                {/* Caption tabs */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E4F0", overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ display: "flex", borderBottom: "1px solid #E5E4F0", background: "#F8F7FF" }}>
                    {CAPTION_TABS.map(t => (
                      <button key={t.key} onClick={() => setTab(t.key)} style={{
                        flex: 1, padding: "10px 8px", border: "none",
                        borderBottom: tab === t.key ? `2px solid #7C3AED` : "2px solid transparent",
                        background: "transparent", cursor: "pointer",
                        fontSize: 11, fontWeight: tab === t.key ? 700 : 500,
                        color: tab === t.key ? "#7C3AED" : "#6B6B80",
                        transition: "all 0.15s"
                      }}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: 16 }}>
                    {editMode ? (
                      <textarea
                        value={editValues[tab] || ""}
                        onChange={e => setEditValues(prev => ({ ...prev, [tab]: e.target.value }))}
                        style={{
                          width: "100%", minHeight: tab === "caption" ? 240 : 120,
                          border: "1px solid #7C3AED44", borderRadius: 8,
                          padding: 12, fontSize: 13, lineHeight: 1.6,
                          resize: "vertical", outline: "none", fontFamily: "inherit",
                          background: "#FAFAFF", color: "#1A1A2E", boxSizing: "border-box"
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: "#1A1A2E", whiteSpace: "pre-wrap", minHeight: 80 }}>
                        {selected[tab] || <span style={{ color: "#9CA3AF" }}>Not generated</span>}
                      </div>
                    )}
                    {tab === "x_caption" && (
                      <div style={{ marginTop: 8, fontSize: 11, color: (editMode ? editValues.x_caption : selected.x_caption)?.length > 240 ? "#EF4444" : "#10B981", fontWeight: 600 }}>
                        {(editMode ? editValues.x_caption : selected.x_caption)?.length || 0} / 240 chars
                      </div>
                    )}
                  </div>
                </div>

                {/* Stories */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E4F0", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E4F0", background: "#F8F7FF", fontSize: 12, fontWeight: 700, color: "#6B6B80", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    📱 Instagram Stories
                  </div>
                  <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {["story_1","story_2","story_3"].map((s, i) => (
                      <div key={s} style={{ background: "#F8F7FF", borderRadius: 8, padding: 12, border: "1px solid #E5E4F0" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", marginBottom: 6, textTransform: "uppercase" }}>Slide {i+1}</div>
                        <div style={{ fontSize: 12, color: "#1A1A2E", lineHeight: 1.5 }}>{selected[s]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT — Metadata panel */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Thumbnail preview */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E4F0", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E4F0", background: "#F8F7FF", fontSize: 12, fontWeight: 700, color: "#6B6B80", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    🖼️ Thumbnail
                  </div>
                  <div style={{ padding: 16 }}>
                    {selected.thumbnail_url ? (
                      <img src={selected.thumbnail_url} alt="thumbnail" style={{ width: "100%", borderRadius: 8 }} />
                    ) : (
                      <div style={{
                        background: `linear-gradient(135deg, ${brandConf.color}22, ${brandConf.color}44)`,
                        border: `1px dashed ${brandConf.color}66`,
                        borderRadius: 8, padding: "32px 16px", textAlign: "center"
                      }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>🖼️</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: brandConf.color, marginBottom: 4 }}>
                          {selected.thumbnail_title}
                        </div>
                        <div style={{ fontSize: 10, color: "#9CA3AF" }}>Bannerbear generating...</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Platforms */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E4F0", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E4F0", background: "#F8F7FF", fontSize: 12, fontWeight: 700, color: "#6B6B80", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Platforms
                  </div>
                  <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    {Object.entries(PLATFORM_CONFIG).map(([key, p]) => {
                      const active = editMode
                        ? editValues.platforms?.includes(key)
                        : selected.platforms?.includes(key);
                      return (
                        <div key={key} onClick={() => editMode && togglePlatform(key)} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 12px", borderRadius: 8,
                          background: active ? `${p.color}10` : "#F8F7FF",
                          border: `1px solid ${active ? p.color + "44" : "#E5E4F0"}`,
                          cursor: editMode ? "pointer" : "default",
                          transition: "all 0.15s", opacity: active ? 1 : 0.45
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14 }}>{p.icon}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: active ? p.color : "#6B6B80" }}>{p.label}</span>
                          </div>
                          <div style={{ width: 16, height: 16, borderRadius: 4, background: active ? p.color : "#E5E4F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {active && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Schedule */}
                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E4F0", overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #E5E4F0", background: "#F8F7FF", fontSize: 12, fontWeight: 700, color: "#6B6B80", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    📅 Scheduled Time
                  </div>
                  <div style={{ padding: 16 }}>
                    {editMode ? (
                      <input
                        type="datetime-local"
                        value={editValues.scheduled_at?.slice(0,16)}
                        onChange={e => setEditValues(prev => ({ ...prev, scheduled_at: e.target.value + ":00+05:30" }))}
                        style={{ width: "100%", padding: "8px 10px", border: "1px solid #7C3AED44", borderRadius: 8, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                      />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1A2E" }}>
                        {formatTime(selected.scheduled_at)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Approve / Reject at bottom for mobile convenience */}
                {selected.status === "PENDING" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button onClick={() => setConfirmAction({ type: "reject", id: selected.id })} style={{
                      padding: "12px", borderRadius: 10, border: "1px solid #EF444444",
                      background: "#FEF2F2", color: "#EF4444", fontWeight: 700, fontSize: 13, cursor: "pointer"
                    }}>✕ Reject</button>
                    <button onClick={() => handleApprove(selected.id)} style={{
                      padding: "12px", borderRadius: 10, border: "none",
                      background: "#10B981", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      boxShadow: "0 2px 8px #10B98133"
                    }}>✓ Approve</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: toast.type === "error" ? "#EF4444" : "#10B981",
          color: "#fff", padding: "12px 20px", borderRadius: 10,
          fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          animation: "fadeIn 0.2s ease"
        }}>
          {toast.msg}
        </div>
      )}

      {/* ── CONFIRM DIALOG ── */}
      {confirmAction && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 998,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: 340, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Reject this content?</div>
            <div style={{ fontSize: 13, color: "#6B6B80", marginBottom: 24 }}>This will mark the item as rejected. Imran will need to re-upload.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmAction(null)} style={{
                flex: 1, padding: 12, borderRadius: 8, border: "1px solid #E5E4F0",
                background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13
              }}>Cancel</button>
              <button onClick={() => handleReject(confirmAction.id)} style={{
                flex: 1, padding: 12, borderRadius: 8, border: "none",
                background: "#EF4444", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13
              }}>Yes, Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = {
    PENDING:  { bg: "#FEF3C7", color: "#92400E", text: "Pending" },
    APPROVED: { bg: "#D1FAE5", color: "#065F46", text: "Approved" },
    REJECTED: { bg: "#FEE2E2", color: "#991B1B", text: "Rejected" },
    PUBLISHED:{ bg: "#DBEAFE", color: "#1E40AF", text: "Published" },
  }[status] || { bg: "#F3F4F6", color: "#374151", text: status };
  return (
    <div style={{ background: cfg.bg, color: cfg.color, borderRadius: 5, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
      {cfg.text}
    </div>
  );
}
