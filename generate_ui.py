import os

pages = [
  { 'name': 'KeywordTracking', 'title': 'Keyword Map', 'icon': 'Activity' },
  { 'name': 'GscIntel', 'title': 'GSC Intel', 'icon': 'LineChart' },
  { 'name': 'OnPageAudit', 'title': 'On-Page Audit', 'icon': 'FileSearch' },
  { 'name': 'ContentFactory', 'title': 'Content Factory', 'icon': 'Brain' },
  { 'name': 'MonthlyReport', 'title': 'Monthly PDF Report', 'icon': 'FileOutput' },
  { 'name': 'RankDropAlert', 'title': 'Rank Drop Alert', 'icon': 'ShieldAlert' },
  { 'name': 'ClientOnboard', 'title': 'Client Onboard', 'icon': 'User' },
  { 'name': 'SerpRadar', 'title': 'SERP Radar', 'icon': 'Eye' },
  { 'name': 'SchemaLibrary', 'title': 'Schema Library', 'icon': 'FileJson' },
  { 'name': 'CompetitorSpy', 'title': 'Competitor Spy', 'icon': 'GitPullRequest' },
  { 'name': 'BacklinkTracker', 'title': 'Backlink Tracker', 'icon': 'Link' },
  { 'name': 'LocalCitations', 'title': 'Local Citations', 'icon': 'MapPin' },
  { 'name': 'LocalSeoBridge', 'title': 'Local SEO Bridge', 'icon': 'Share2' }
]

for p in pages:
    content = f"""import React, {{ useState, useEffect }} from 'react';
import {{ C }} from '../../constants/theme.js';
import {{ {p['icon']}, Loader2 }} from 'lucide-react';
import {{ api }} from '../../services/api.js';

export default function {p['name']}() {{
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {{
    const fetchData = async () => {{
      try {{
        const res = await api.get('/thedal/{p['name'].lower()}');
        if (res.data) setData(res.data);
      }} catch (err) {{
        console.error('Failed to load data', err);
      }} finally {{
        setLoading(false);
      }}
    }};
    fetchData();
  }}, []);

  if (loading) {{
    return (
      <div style={{{{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: C.background }}}}>
        <Loader2 size={{32}} color={{C.accent}} className="spin" />
      </div>
    );
  }}

  const items = data?.items || [];

  return (
    <div style={{{{ padding: 30, color: C.text, height: '100%', overflowY: 'auto', background: C.background }}}}>
      <div style={{{{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}}}>
        <div>
          <h1 style={{{{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', margin: 0, fontFamily: "'Syne', sans-serif" }}}}>{p['title']}</h1>
          <p style={{{{ color: C.muted, fontSize: 14, marginTop: 4 }}}}>Dynamic data loaded from database.</p>
        </div>
      </div>
      <div style={{{{ background: C.surface, border: `1px solid ${{C.border}}`, borderRadius: 12, padding: 20 }}}}>
        <table style={{{{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}}}>
          <thead>
            <tr style={{{{ borderBottom: `1px solid ${{C.border}}` }}}}>
              <th style={{{{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}}}>ID</th>
              <th style={{{{ padding: '12px 0', color: C.muted, fontSize: 12, fontWeight: 600 }}}}>DATA</th>
            </tr>
          </thead>
          <tbody>
            {{items.length > 0 ? items.map((item, idx) => (
              <tr key={{idx}} style={{{{ borderBottom: `1px solid ${{C.border}}55` }}}}>
                <td style={{{{ padding: '16px 0', fontSize: 14, color: '#e2e8f0' }}}}>{{item.id}}</td>
                <td style={{{{ padding: '16px 0', fontSize: 13 }}}}>{{JSON.stringify(item)}}</td>
              </tr>
            )) : (
              <tr><td colSpan={{2}} style={{{{ padding: '30px 0', textAlign: 'center', color: C.muted }}}}>No records found. Setup data in DB.</td></tr>
            )}}
          </tbody>
        </table>
      </div>
    </div>
  );
}}
"""
    filepath = os.path.join('src', 'views', 'thedal', p['name'] + '.jsx')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Generated all files")
