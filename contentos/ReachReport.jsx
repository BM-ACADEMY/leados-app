export function ReachReport({
  items,
  selectedBrand,
  isSameBrand
}) {
  const publishedItems = items.filter(item => {
    const s = (item.status || '').toUpperCase();
    if (s !== 'PUBLISHED') return false;
    
    if (selectedBrand !== 'all') {
      return isSameBrand(item.brand_name, selectedBrand);
    }
    return true;
  });

  // Dynamic Reach Stats Calculation
  const totalPublished = publishedItems.length;
  const estimatedReach = totalPublished * 4.8; // e.g. 4.8K reach per post
  const estimatedClicks = Math.floor(estimatedReach * 0.04 * 10); // 4% click rate

  // Platforms reach breakdown
  const platformsData = [
    { label: 'Instagram Reel', color: '#DD2A7B', percent: 58 },
    { label: 'Instagram Story', color: '#8134AF', percent: 18 },
    { label: 'Facebook Post/Reel', color: '#1877F2', percent: 15 },
    { label: 'YouTube Short', color: '#FF0000', percent: 9 }
  ];

  // Brands reach breakdown (based on active selection or mock ratios)
  const brandsMock = [
    { name: 'BM Academy', color: '#8B72F0', val: 142, str: '142K' },
    { name: 'BM TechX', color: '#00C4A0', val: 68, str: '68K' },
    { name: 'Namma Pondy Properties', color: '#34C77B', val: 54, str: '54K' },
    { name: 'TravellersNeed', color: '#F04A5E', val: 28, str: '28K' },
    { name: "Dada's Kitchen", color: '#D4A843', val: 20, str: '20K' }
  ];

  // Filter brand reach display based on selectedBrand
  const getBrandReportData = () => {
    if (selectedBrand === 'all') return brandsMock;
    return brandsMock.filter(b => b.name.toLowerCase().includes(selectedBrand.toLowerCase()));
  };

  const brandReportData = getBrandReportData();
  const maxBrandVal = Math.max(...brandsMock.map(b => b.val));

  return (
    <div className="page on">
      {/* Stats */}
      <div className="sg">
        <div className="sc teal">
          <div className="sc-lbl">Total Reach · 7d</div>
          <div className="sc-val teal">
            {selectedBrand === 'all' ? '312.4K' : `${estimatedReach.toFixed(1)}K`}
          </div>
          <div className="sc-sub up">▲ 22% vs last week</div>
        </div>
        <div className="sc gold">
          <div className="sc-lbl">WhatsApp Clicks</div>
          <div className="sc-val gold">
            {selectedBrand === 'all' ? '1,284' : estimatedClicks}
          </div>
          <div className="sc-sub up">▲ from course stories</div>
        </div>
        <div className="sc grn">
          <div className="sc-lbl">Posts Published</div>
          <div className="sc-val grn">{selectedBrand === 'all' ? '64' : totalPublished}</div>
          <div className="sc-sub">completed streams</div>
        </div>
        <div className="sc pur">
          <div className="sc-lbl">Top Format</div>
          <div className="sc-val" style={{ fontSize: 18, color: 'var(--pur)' }}>IG Reel</div>
          <div className="sc-sub">58% of total reach</div>
        </div>
      </div>

      {/* Brand reach breakdown */}
      <div className="panel">
        <div className="panel-h">Reach by Brand · Last 7 Days</div>
        <div className="panel-b" style={{ padding: 20 }}>
          {brandReportData.length === 0 ? (
            <div className="empty">No reach records found for this brand</div>
          ) : (
            brandReportData.map(b => (
              <div key={b.name} className="bar-row">
                <div className="bar-lbl">
                  <span className="ms-dot" style={{ background: b.color }} />
                  {b.name}
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(b.val / maxBrandVal) * 100}%`, background: b.color }} />
                </div>
                <div className="bar-val">{b.str}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Platform reach breakdown */}
      <div className="panel">
        <div className="panel-h">Reach by Platform</div>
        <div className="panel-b" style={{ padding: 20 }}>
          {platformsData.map(p => (
            <div key={p.label} className="bar-row">
              <div className="bar-lbl">{p.label}</div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${p.percent}%`, background: p.color }} />
              </div>
              <div className="bar-val">{p.percent}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
