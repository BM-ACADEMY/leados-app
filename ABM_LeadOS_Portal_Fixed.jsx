import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import {
  Users, Bell, Settings, LogOut, Search, Plus, Download,
  Upload, Eye, Send, CheckCircle, Phone, Zap, Brain,
  Building2, FileText, Target, X, Home, BarChart2, Edit2,
  AlertCircle, Inbox, Copy, Trash2
} from "lucide-react";

// ── GLOBAL STYLE (injected once) ──────────────────────────
const STYLE = [
  "@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');",
  "*, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }",
  "body { font-family:'DM Sans',sans-serif; background:#060c17; color:#e2e8f0; }",
  "::-webkit-scrollbar{width:4px;height:4px}",
  "::-webkit-scrollbar-track{background:#0b1322}",
  "::-webkit-scrollbar-thumb{background:#1e3050;border-radius:4px}",
  "input,textarea,select{font-family:'DM Sans',sans-serif}",
  "button{cursor:pointer}",
].join("\n");

// ── THEME ─────────────────────────────────────────────────
const C = {
  bg:"#060c17", surface:"#0c1525", card:"#101c30",
  border:"#1a2e4a", accent:"#f97316", accentDim:"#7c2d12",
  blue:"#3b82f6", green:"#10b981", red:"#ef4444",
  purple:"#8b5cf6", pink:"#ec4899",
  text:"#e2e8f0", muted:"#475569", dim:"#334155",
};

// ── MOCK DATA ─────────────────────────────────────────────
const BRANDS = ["All Brands","BM Academy","BM TechX","EduConsultants","Real Estate","Haramain","Dada's Kitchen","TravellersNeed"];

const LEADS = [
  {id:1,name:"Arjun Kumar",phone:"98765 43210",source:"Meta Ads",brand:"BM Academy",status:"hot",score:87,assigned:"Karthika",time:"2h ago",interest:"Digital Marketing"},
  {id:2,name:"Priya Devi",phone:"98654 32109",source:"Instagram DM",brand:"BM Academy",status:"warm",score:62,assigned:"Satish",time:"5h ago",interest:"Full Stack Dev"},
  {id:3,name:"Mohamed Salim",phone:"98543 21098",source:"Website",brand:"BM TechX",status:"hot",score:91,assigned:"Satish",time:"1h ago",interest:"Clinic Package"},
  {id:4,name:"Kavitha R",phone:"98432 10987",source:"WhatsApp",brand:"EduConsultants",status:"warm",score:55,assigned:"Karthika",time:"1d ago",interest:"MBBS Abroad"},
  {id:5,name:"Ravi Shankar",phone:"98321 09876",source:"Meta Ads",brand:"Real Estate",status:"cold",score:28,assigned:"Satish",time:"3d ago",interest:"Plot Investment"},
  {id:6,name:"Deepa M",phone:"98210 98765",source:"Referral",brand:"BM Academy",status:"converted",score:100,assigned:"Karthika",time:"Yesterday",interest:"Video Editing"},
  {id:7,name:"Suresh P",phone:"98109 87654",source:"Google Sheet",brand:"BM TechX",status:"warm",score:71,assigned:"Satish",time:"3h ago",interest:"Social Media Pack"},
  {id:8,name:"Anitha S",phone:"98098 76543",source:"Meta Ads",brand:"BM Academy",status:"hot",score:83,assigned:"Karthika",time:"30m ago",interest:"Digital Marketing"},
];

const CONVO = [
  {from:"lead",text:"Hi, saw your ad about digital marketing course",time:"10:23"},
  {from:"ai",text:"Hi Arjun! Thanks for your interest in BM Academy.\n\nWhich course interests you?\n1 Digital Marketing\n2 Full Stack Dev\n3 Video Editing",time:"10:23"},
  {from:"lead",text:"1 - Digital Marketing",time:"10:25"},
  {from:"ai",text:"Great choice! Are you a student or working professional?",time:"10:25"},
  {from:"lead",text:"Final year student",time:"10:27"},
  {from:"ai",text:"Perfect timing!\n\nOur Digital Marketing Pro course:\nLive projects + portfolio\nPlacement support\nGoogle certification\n\nScholarship batch: Rs 2,999 (orig Rs 5,999)\nEMI: Rs 999 now + rest after placement\n\nShall I block a seat?",time:"10:27"},
  {from:"lead",text:"Sounds good! When does batch start?",time:"10:28"},
  {from:"ai",text:"June 2nd — Monday!\nOnly 3 seats remaining.\n\nSend payment link now?",time:"10:29"},
];

const INBOX = [
  {id:1,name:"Arjun Kumar",brand:"BM Academy",last:"When does batch start?",time:"10:29",unread:1,status:"hot"},
  {id:8,name:"Anitha S",brand:"BM Academy",last:"Ready to pay, send link",time:"10:15",unread:2,status:"hot"},
  {id:3,name:"Mohamed Salim",brand:"BM TechX",last:"Can you do a demo visit?",time:"9:42",unread:0,status:"hot"},
  {id:2,name:"Priya Devi",brand:"BM Academy",last:"Let me check with parents",time:"Yesterday",unread:0,status:"warm"},
  {id:7,name:"Suresh P",brand:"BM TechX",last:"Whats in starter pack?",time:"Yesterday",unread:0,status:"warm"},
];

const TEMPLATES = [
  {id:1,name:"welcome_qualifier",cat:"UTILITY",status:"approved",brand:"BM Academy",sub:"May 12",apv:"May 14",uses:342},
  {id:2,name:"followup_day3",cat:"MARKETING",status:"approved",brand:"All Brands",sub:"May 10",apv:"May 12",uses:891},
  {id:3,name:"special_offer_academy",cat:"MARKETING",status:"pending",brand:"BM Academy",sub:"May 18",apv:null,uses:0},
  {id:4,name:"call_booking",cat:"UTILITY",status:"approved",brand:"All Brands",sub:"May 10",apv:"May 12",uses:214},
  {id:5,name:"clinic_intro_techx",cat:"UTILITY",status:"rejected",brand:"BM TechX",sub:"May 15",apv:null,uses:0},
];

const CAMPAIGNS = [
  {id:1,name:"Academy May Batch Fill",brand:"BM Academy",total:245,sent:245,delivered:231,read:187,replied:43,status:"completed",date:"May 15"},
  {id:2,name:"TechX Clinic Outreach",brand:"BM TechX",total:89,sent:89,delivered:84,read:61,replied:18,status:"completed",date:"May 16"},
  {id:3,name:"Real Estate Warm Leads",brand:"Real Estate",total:156,sent:98,delivered:95,read:47,replied:8,status:"running",date:"May 19"},
];

const CLIENTS = [
  {id:1,name:"Raahath Dental Care",type:"Clinic",plan:"Pro",status:"active",leads:234,conv:28,rev:15000,joined:"Apr 2026"},
  {id:2,name:"Vasanth Academy",type:"Education",plan:"Starter",status:"active",leads:189,conv:31,rev:8000,joined:"May 2026"},
  {id:3,name:"GreenBuild Properties",type:"Real Estate",plan:"Enterprise",status:"active",leads:445,conv:19,rev:25000,joined:"Mar 2026"},
  {id:4,name:"Spice Garden",type:"F&B",plan:"Starter",status:"inactive",leads:67,conv:12,rev:0,joined:"Apr 2026"},
];

const W7 = [{d:"Mon",l:12,c:3},{d:"Tue",l:19,c:5},{d:"Wed",l:15,c:4},{d:"Thu",l:25,c:8},{d:"Fri",l:22,c:7},{d:"Sat",l:31,c:11},{d:"Sun",l:18,c:6}];
const REV = [{m:"Jan",r:45000},{m:"Feb",r:62000},{m:"Mar",r:58000},{m:"Apr",r:79000},{m:"May",r:94000}];
const SRC = [{name:"Meta Ads",v:45,c:C.accent},{name:"WhatsApp",v:22,c:C.blue},{name:"Website",v:18,c:C.purple},{name:"Instagram",v:10,c:C.pink},{name:"Referral",v:5,c:C.green}];
const FNL = [{s:"Total Leads",n:142},{s:"Contacted",n:118},{s:"Qualified",n:79},{s:"Hot Leads",n:34},{s:"Converted",n:17}];

// ── ATOMS ────────────────────────────────────────────────
const Badge = ({status}) => {
  const M={hot:{bg:"#2d1010",tc:"#ef4444",l:"Hot"},warm:{bg:"#2d1f0a",tc:"#f97316",l:"Warm"},cold:{bg:"#0f1a2e",tc:"#60a5fa",l:"Cold"},converted:{bg:"#0a2018",tc:"#34d399",l:"Converted"},lost:{bg:"#1a0f2e",tc:"#a78bfa",l:"Lost"}};
  const s=M[status]||M.cold;
  return <span style={{background:s.bg,color:s.tc,padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5}}>
    <span style={{width:5,height:5,borderRadius:"50%",background:s.tc}}/>{s.l}
  </span>;
};

const TBadge = ({status}) => {
  const M={approved:{i:"✓",c:"#34d399",b:"#0a2018"},pending:{i:"⏳",c:"#f97316",b:"#2d1f0a"},rejected:{i:"✗",c:"#ef4444",b:"#2d1010"},draft:{i:"○",c:"#64748b",b:"#1a2744"}};
  const s=M[status]||M.draft;
  return <span style={{background:s.b,color:s.c,padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600}}>{s.i} {status.charAt(0).toUpperCase()+status.slice(1)}</span>;
};

const ScoreBar = ({score}) => {
  const col = score>=80?C.green:score>=55?C.accent:C.blue;
  return <div style={{display:"flex",alignItems:"center",gap:7}}>
    <div style={{width:56,height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
      <div style={{width:score+"%",height:"100%",background:col,borderRadius:2}}/>
    </div>
    <span style={{fontSize:11,color:col,fontWeight:600}}>{score}</span>
  </div>;
};

const Stat = ({label,value,change,Icon,color}) => (
  <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:"18px 22px",flex:1,minWidth:0}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <p style={{fontSize:10,color:C.muted,letterSpacing:0.8,textTransform:"uppercase",fontWeight:600,marginBottom:8}}>{label}</p>
        <p style={{fontSize:24,fontWeight:700,color:C.text,fontFamily:"'Syne',sans-serif"}}>{value}</p>
        {change && <p style={{fontSize:11,color:change>0?"#34d399":"#ef4444",marginTop:4,fontWeight:500}}>{change>0?"↑":"↓"} {Math.abs(change)}% vs last week</p>}
      </div>
      <div style={{width:38,height:38,borderRadius:10,background:color+"20",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon size={17} color={color}/>
      </div>
    </div>
  </div>
);

const SH = ({title,action,label}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
    <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:C.text}}>{title}</h2>
    {label && <button onClick={action} style={{background:C.accent,border:"none",color:"#fff",padding:"6px 14px",borderRadius:7,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Plus size={12}/>{label}</button>}
  </div>
);

// ── VIEWS ─────────────────────────────────────────────────

const Dashboard = () => (
  <div style={{padding:26,overflowY:"auto",height:"100%"}}>
    <div style={{marginBottom:22}}>
      <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:C.text}}>Good morning, Kamar</h1>
      <p style={{color:C.muted,fontSize:12,marginTop:2}}>Wednesday, May 20 · ABM Groups Overview</p>
    </div>

    <div style={{display:"flex",gap:12,marginBottom:20,flexWrap:"wrap"}}>
      <Stat label="Leads Today" value="47" change={12} Icon={Users} color={C.accent}/>
      <Stat label="Hot Leads" value="13" change={8} Icon={Target} color={C.red}/>
      <Stat label="Converted" value="6" change={-2} Icon={CheckCircle} color={C.green}/>
      <Stat label="Revenue This Month" value="Rs 94K" change={19} Icon={BarChart2} color={C.blue}/>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16,marginBottom:16}}>
      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:20}}>
        <SH title="Leads This Week"/>
        <ResponsiveContainer width="100%" height={170}>
          <AreaChart data={W7}>
            <defs>
              <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity={0.3}/><stop offset="100%" stopColor={C.accent} stopOpacity={0}/></linearGradient>
              <linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.3}/><stop offset="100%" stopColor={C.green} stopOpacity={0}/></linearGradient>
            </defs>
            <XAxis dataKey="d" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:C.card,border:"1px solid "+C.border,borderRadius:8,fontSize:11}}/>
            <Area type="monotone" dataKey="l" name="Leads" stroke={C.accent} fill="url(#ga)" strokeWidth={2}/>
            <Area type="monotone" dataKey="c" name="Converted" stroke={C.green} fill="url(#gg)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:20}}>
        <SH title="Lead Sources"/>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <PieChart width={120} height={120}>
            <Pie data={SRC} dataKey="v" cx={55} cy={55} innerRadius={30} outerRadius={52} paddingAngle={3}>
              {SRC.map((e,i)=><Cell key={i} fill={e.c}/>)}
            </Pie>
          </PieChart>
          <div style={{flex:1}}>
            {SRC.map((s,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:s.c}}/>
                  <span style={{fontSize:10,color:C.muted}}>{s.name}</span>
                </div>
                <span style={{fontSize:10,color:C.text,fontWeight:600}}>{s.v}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:20}}>
        <SH title="Revenue Trend"/>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={REV} barSize={22}>
            <XAxis dataKey="m" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v=>"Rs "+(v/1000).toFixed(0)+"K"} contentStyle={{background:C.card,border:"1px solid "+C.border,borderRadius:8,fontSize:11}}/>
            <Bar dataKey="r" fill={C.accent} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:20}}>
        <SH title="Conversion Funnel"/>
        {FNL.map((f,i)=>(
          <div key={i} style={{marginBottom:9}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:10,color:C.muted}}>{f.s}</span>
              <span style={{fontSize:10,color:C.text,fontWeight:600}}>{f.n}</span>
            </div>
            <div style={{height:4,background:C.border,borderRadius:2}}>
              <div style={{height:"100%",width:((f.n/142)*100)+"%",background:"rgba(249,115,22,"+(1-i*0.15)+")",borderRadius:2}}/>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div style={{background:"#1a0800",border:"1px solid #7c2d12",borderRadius:14,padding:18}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <AlertCircle size={15} color={C.accent}/>
        <span style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:700,color:C.accent}}>HOT LEADS NEEDING ATTENTION</span>
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        {LEADS.filter(l=>l.status==="hot").map(l=>(
          <div key={l.id} style={{background:C.card,border:"1px solid "+C.border,borderRadius:10,padding:"10px 13px",display:"flex",alignItems:"center",gap:9,minWidth:190}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:C.accent+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.accent}}>{l.name[0]}</div>
            <div>
              <p style={{fontSize:12,fontWeight:600,color:C.text}}>{l.name}</p>
              <p style={{fontSize:10,color:C.muted}}>{l.brand} - {l.time}</p>
            </div>
            <div style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:C.red}}/>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const LeadsView = ({onLeadClick}) => {
  const [filter,setFilter] = useState("all");
  const [search,setSearch] = useState("");
  const tabs = ["all","hot","warm","cold","converted"];
  const filtered = LEADS.filter(l=>(filter==="all"||l.status===filter)&&(l.name.toLowerCase().includes(search.toLowerCase())||l.phone.includes(search)));

  return (
    <div style={{padding:26,overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:C.text}}>Lead Management</h1>
          <p style={{color:C.muted,fontSize:12,marginTop:2}}>{LEADS.length} total leads across all brands</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button style={{background:C.card,border:"1px solid "+C.border,color:C.muted,padding:"7px 12px",borderRadius:7,fontSize:11,display:"flex",alignItems:"center",gap:5}}><Upload size={12}/>Import CSV</button>
          <button style={{background:C.card,border:"1px solid "+C.border,color:C.muted,padding:"7px 12px",borderRadius:7,fontSize:11,display:"flex",alignItems:"center",gap:5}}><Download size={12}/>Export</button>
          <button style={{background:C.accent,border:"none",color:"#fff",padding:"7px 14px",borderRadius:7,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Plus size={12}/>Add Lead</button>
        </div>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center"}}>
        <div style={{display:"flex",background:C.card,border:"1px solid "+C.border,borderRadius:9,overflow:"hidden"}}>
          {tabs.map(t=>(
            <button key={t} onClick={()=>setFilter(t)} style={{padding:"7px 13px",fontSize:11,fontWeight:600,border:"none",background:filter===t?C.accent:"transparent",color:filter===t?"#fff":C.muted,textTransform:"capitalize"}}>
              {t==="all"?"All":t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:7,background:C.card,border:"1px solid "+C.border,borderRadius:9,padding:"0 12px",height:36}}>
          <Search size={12} color={C.muted}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or phone..." style={{background:"transparent",border:"none",color:C.text,fontSize:12,outline:"none",width:170}}/>
        </div>
      </div>

      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:"1px solid "+C.border}}>
              {["Lead","Phone","Source","Brand","Status","Score","Assigned","Last Contact",""].map(h=>(
                <th key={h} style={{padding:"11px 14px",fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.8,textAlign:"left"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((l,i)=>(
              <tr key={l.id} onClick={()=>onLeadClick(l)} style={{borderBottom:"1px solid "+C.border,cursor:"pointer",background:i%2===0?"transparent":"rgba(255,255,255,0.01)"}}>
                <td style={{padding:"13px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    <div style={{width:30,height:30,borderRadius:"50%",background:C.accent+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.accent,flexShrink:0}}>{l.name[0]}</div>
                    <div>
                      <p style={{fontSize:12,fontWeight:600,color:C.text}}>{l.name}</p>
                      <p style={{fontSize:10,color:C.muted}}>{l.interest}</p>
                    </div>
                  </div>
                </td>
                <td style={{padding:"13px 14px",fontSize:11,color:C.muted}}>{l.phone}</td>
                <td style={{padding:"13px 14px"}}><span style={{fontSize:10,color:C.blue,background:"#0f1e38",padding:"2px 7px",borderRadius:10}}>{l.source}</span></td>
                <td style={{padding:"13px 14px",fontSize:11,color:C.muted}}>{l.brand}</td>
                <td style={{padding:"13px 14px"}}><Badge status={l.status}/></td>
                <td style={{padding:"13px 14px"}}><ScoreBar score={l.score}/></td>
                <td style={{padding:"13px 14px",fontSize:11,color:C.muted}}>{l.assigned}</td>
                <td style={{padding:"13px 14px",fontSize:10,color:C.dim}}>{l.time}</td>
                <td style={{padding:"13px 14px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button style={{width:26,height:26,borderRadius:6,background:"transparent",border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={e=>{e.stopPropagation();onLeadClick(l)}}><Eye size={11} color={C.muted}/></button>
                    <button style={{width:26,height:26,borderRadius:6,background:"transparent",border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center"}}><Phone size={11} color={C.muted}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length===0 && <div style={{textAlign:"center",padding:32,color:C.muted}}>No leads match this filter</div>}
      </div>
    </div>
  );
};

const LeadModal = ({lead,onClose}) => {
  const [msg,setMsg] = useState("");
  if(!lead) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)"}} onClick={onClose}>
      <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:18,width:840,maxHeight:"84vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"18px 22px",borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:13}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:C.accent+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:700,color:C.accent}}>{lead.name[0]}</div>
            <div>
              <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:15,fontWeight:700,color:C.text}}>{lead.name}</h3>
              <p style={{color:C.muted,fontSize:11}}>{lead.phone} - {lead.brand} - {lead.source}</p>
            </div>
          </div>
          <div style={{display:"flex",gap:9,alignItems:"center"}}>
            <Badge status={lead.status}/><ScoreBar score={lead.score}/>
            <button onClick={onClose} style={{width:30,height:30,borderRadius:7,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center"}}><X size={13} color={C.muted}/></button>
          </div>
        </div>
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          <div style={{flex:1,display:"flex",flexDirection:"column",borderRight:"1px solid "+C.border}}>
            <div style={{padding:"10px 14px",background:C.accent+"10",borderBottom:"1px solid "+C.border}}>
              <p style={{fontSize:9,color:C.accent,fontWeight:600,letterSpacing:0.8}}>WHATSAPP CONVERSATION - AI AGENT ACTIVE</p>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
              {CONVO.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:m.from==="lead"?"flex-start":"flex-end"}}>
                  <div style={{maxWidth:"73%",background:m.from==="lead"?C.card:C.accent+"20",border:"1px solid "+(m.from==="lead"?C.border:C.accentDim),borderRadius:m.from==="lead"?"4px 12px 12px 12px":"12px 4px 12px 12px",padding:"9px 12px"}}>
                    {m.from==="ai" && <p style={{fontSize:8,color:C.accent,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>AI AGENT</p>}
                    <p style={{fontSize:12,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.6}}>{m.text}</p>
                    <p style={{fontSize:9,color:C.muted,marginTop:3,textAlign:"right"}}>{m.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{padding:10,borderTop:"1px solid "+C.border,display:"flex",gap:7}}>
              <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Manual reply..." style={{flex:1,background:C.card,border:"1px solid "+C.border,borderRadius:9,padding:"9px 12px",color:C.text,fontSize:12,outline:"none"}}/>
              <button style={{background:C.accent,border:"none",width:38,height:38,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center"}}><Send size={13} color="#fff"/></button>
            </div>
          </div>
          <div style={{width:220,overflowY:"auto",padding:14}}>
            <p style={{fontSize:9,color:C.muted,letterSpacing:0.8,fontWeight:600,marginBottom:11}}>LEAD DETAILS</p>
            {[["Interest",lead.interest],["Assigned",lead.assigned],["Last Contact",lead.time],["Source",lead.source]].map(([k,v])=>(
              <div key={k} style={{marginBottom:11}}>
                <p style={{fontSize:9,color:C.dim,marginBottom:2}}>{k}</p>
                <p style={{fontSize:12,color:C.text,fontWeight:500}}>{v}</p>
              </div>
            ))}
            <div style={{height:1,background:C.border,margin:"14px 0"}}/>
            <p style={{fontSize:9,color:C.muted,letterSpacing:0.8,fontWeight:600,marginBottom:11}}>QUICK ACTIONS</p>
            {[["Send Payment Link",C.green],["Book Call",C.blue],["Mark Converted",C.accent],["Mark Lost",C.red]].map(([l,col])=>(
              <button key={l} style={{width:"100%",background:"transparent",border:"1px solid "+C.border,borderRadius:7,color:col,padding:"7px 11px",fontSize:11,fontWeight:600,marginBottom:7,textAlign:"left"}}>{l}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const InboxView = () => {
  const [active,setActive] = useState(INBOX[0]);
  const [msg,setMsg] = useState("");
  return (
    <div style={{height:"100%",display:"flex"}}>
      <div style={{width:290,borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"18px 14px",borderBottom:"1px solid "+C.border}}>
          <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:14,fontWeight:700,color:C.text,marginBottom:11}}>WhatsApp Inbox</h2>
          <div style={{display:"flex",alignItems:"center",gap:7,background:C.card,border:"1px solid "+C.border,borderRadius:7,padding:"7px 11px"}}>
            <Search size={11} color={C.muted}/>
            <input placeholder="Search..." style={{background:"transparent",border:"none",color:C.text,fontSize:11,outline:"none",width:"100%"}}/>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto"}}>
          {INBOX.map(l=>(
            <div key={l.id} onClick={()=>setActive(l)} style={{padding:"13px 14px",borderBottom:"1px solid "+C.border,cursor:"pointer",background:active?.id===l.id?C.accent+"10":"transparent",borderLeft:active?.id===l.id?"3px solid "+C.accent:"3px solid transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:C.accent+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.accent,flexShrink:0}}>{l.name[0]}</div>
                  <div>
                    <p style={{fontSize:12,fontWeight:600,color:C.text}}>{l.name}</p>
                    <p style={{fontSize:9,color:C.muted}}>{l.brand}</p>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <p style={{fontSize:9,color:C.dim}}>{l.time}</p>
                  {l.unread>0 && <div style={{width:15,height:15,borderRadius:"50%",background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",marginLeft:"auto",marginTop:2}}>{l.unread}</div>}
                </div>
              </div>
              <p style={{fontSize:10,color:C.muted,paddingLeft:40,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{l.last}</p>
            </div>
          ))}
        </div>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"13px 18px",borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:11}}>
            <div style={{width:36,height:36,borderRadius:"50%",background:C.accent+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.accent}}>{active?.name[0]}</div>
            <div>
              <p style={{fontSize:13,fontWeight:600,color:C.text}}>{active?.name}</p>
              <p style={{fontSize:9,color:C.green}}>AI Agent Active - {active?.brand}</p>
            </div>
          </div>
          <div style={{display:"flex",gap:7}}>
            <button style={{background:C.card,border:"1px solid "+C.border,borderRadius:7,padding:"5px 11px",color:C.muted,fontSize:11}}>Take Over</button>
            <button style={{background:C.card,border:"1px solid "+C.border,borderRadius:7,padding:"5px 11px",color:C.muted,fontSize:11}}>View Lead</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:18,display:"flex",flexDirection:"column",gap:11,background:C.bg+"88"}}>
          {CONVO.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.from==="lead"?"flex-start":"flex-end"}}>
              <div style={{maxWidth:"60%",background:m.from==="lead"?C.card:C.accent+"20",border:"1px solid "+(m.from==="lead"?C.border:C.accentDim),borderRadius:m.from==="lead"?"4px 13px 13px 13px":"13px 4px 13px 13px",padding:"9px 13px"}}>
                {m.from==="ai" && <p style={{fontSize:8,color:C.accent,fontWeight:700,letterSpacing:0.8,marginBottom:4}}>AI AGENT</p>}
                <p style={{fontSize:12,color:C.text,whiteSpace:"pre-wrap",lineHeight:1.7}}>{m.text}</p>
                <p style={{fontSize:9,color:C.muted,marginTop:4,textAlign:"right"}}>{m.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{padding:14,borderTop:"1px solid "+C.border,display:"flex",gap:9}}>
          <input value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Type manual message (overrides AI for this reply)..." style={{flex:1,background:C.card,border:"1px solid "+C.border,borderRadius:11,padding:"10px 13px",color:C.text,fontSize:12,outline:"none"}}/>
          <button style={{background:C.accent,border:"none",width:42,height:42,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center"}}><Send size={15} color="#fff"/></button>
        </div>
      </div>
    </div>
  );
};

const CampaignsView = () => {
  const [tab,setTab] = useState("list");
  const statC = {completed:{tc:C.green,bg:"#0a2018"},running:{tc:C.accent,bg:"#2d1a0a"},scheduled:{tc:C.blue,bg:"#0f1e38"}};
  return (
    <div style={{padding:26,overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:C.text}}>Bulk Campaigns</h1>
          <p style={{color:C.muted,fontSize:12,marginTop:2}}>Send bulk WhatsApp messages using approved templates</p>
        </div>
        <button onClick={()=>setTab("create")} style={{background:C.accent,border:"none",color:"#fff",padding:"8px 16px",borderRadius:7,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Plus size={12}/>New Campaign</button>
      </div>
      <div style={{display:"flex",background:C.card,border:"1px solid "+C.border,borderRadius:9,overflow:"hidden",marginBottom:18,width:"fit-content"}}>
        {["list","create"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 18px",fontSize:12,fontWeight:600,border:"none",background:tab===t?C.accent:"transparent",color:tab===t?"#fff":C.muted,textTransform:"capitalize"}}>{t==="list"?"Campaign List":"Create Campaign"}</button>
        ))}
      </div>
      {tab==="list" ? (
        <>
          <div style={{display:"flex",gap:12,marginBottom:18}}>
            {[["Total","4",C.accent],["Running","1",C.green],["Total Sent","432",C.blue],["Avg Read","74%",C.purple]].map(([l,v,col])=>(
              <div key={l} style={{background:C.card,border:"1px solid "+C.border,borderRadius:11,padding:"14px 18px",flex:1}}>
                <p style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:5}}>{l}</p>
                <p style={{fontSize:20,fontWeight:700,color:col,fontFamily:"'Syne',sans-serif"}}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{borderBottom:"1px solid "+C.border}}>
                  {["Campaign","Brand","Sent","Delivered","Read","Replied","Status","Date"].map(h=>(
                    <th key={h} style={{padding:"11px 14px",fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.8,textAlign:"left"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAMPAIGNS.map(c=>{
                  const s=statC[c.status]||statC.completed;
                  return (
                    <tr key={c.id} style={{borderBottom:"1px solid "+C.border}}>
                      <td style={{padding:"13px 14px",fontSize:12,fontWeight:600,color:C.text}}>{c.name}</td>
                      <td style={{padding:"13px 14px",fontSize:11,color:C.muted}}>{c.brand}</td>
                      <td style={{padding:"13px 14px",fontSize:12,color:C.text}}>{c.sent}</td>
                      <td style={{padding:"13px 14px",fontSize:12,color:C.green}}>{c.delivered}</td>
                      <td style={{padding:"13px 14px",fontSize:12,color:C.blue}}>{c.read}</td>
                      <td style={{padding:"13px 14px",fontSize:12,color:C.accent}}>{c.replied}</td>
                      <td style={{padding:"13px 14px"}}><span style={{background:s.bg,color:s.tc,padding:"3px 9px",borderRadius:12,fontSize:11,fontWeight:600,textTransform:"capitalize"}}>{c.status}</span></td>
                      <td style={{padding:"13px 14px",fontSize:11,color:C.dim}}>{c.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
          <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:22}}>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:18}}>Campaign Setup</h3>
            {[["Campaign Name","text","e.g. Academy June Batch"],["Select Brand","select",""],["Target Audience","select",""]].map(f=>(
              <div key={f[0]} style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:10,color:C.muted,marginBottom:5,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>{f[0]}</label>
                {f[1]==="select"
                  ? <select style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,color:C.text,padding:"9px 11px",fontSize:12,outline:"none"}}>
                      <option>Select option</option>
                    </select>
                  : <input placeholder={f[2]} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,color:C.text,padding:"9px 11px",fontSize:12,outline:"none"}}/>
                }
              </div>
            ))}
            <div style={{background:C.blue+"15",border:"1px solid "+C.blue+"30",borderRadius:7,padding:11}}>
              <p style={{fontSize:11,color:C.blue}}>Estimated reach: 234 leads match current filter</p>
            </div>
          </div>
          <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:22}}>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:18}}>Message & Schedule</h3>
            <div style={{marginBottom:14}}>
              <label style={{display:"block",fontSize:10,color:C.muted,marginBottom:5,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>Select Approved Template</label>
              <select style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,color:C.text,padding:"9px 11px",fontSize:12,outline:"none"}}>
                {TEMPLATES.filter(t=>t.status==="approved").map(t=><option key={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:7,padding:13,marginBottom:14}}>
              <p style={{fontSize:9,color:C.muted,marginBottom:7,letterSpacing:0.8}}>PREVIEW</p>
              <div style={{background:C.accent+"15",border:"1px solid "+C.accentDim,borderRadius:9,padding:11}}>
                <p style={{fontSize:12,color:C.text,lineHeight:1.7}}>Hi [Name]! Thanks for your interest in BM Academy. Which course interests you? Reply 1, 2, or 3.</p>
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:10,color:C.muted,marginBottom:5,fontWeight:600,letterSpacing:0.5,textTransform:"uppercase"}}>Schedule Time</label>
              <input type="datetime-local" style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,color:C.text,padding:"9px 11px",fontSize:12,outline:"none"}}/>
            </div>
            <button style={{width:"100%",background:C.accent,border:"none",borderRadius:9,padding:13,color:"#fff",fontWeight:700,fontSize:13}}>Launch Campaign</button>
          </div>
        </div>
      )}
    </div>
  );
};

const TemplatesView = () => (
  <div style={{padding:26,overflowY:"auto",height:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <div>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:C.text}}>Template Management</h1>
        <p style={{color:C.muted,fontSize:12,marginTop:2}}>Create, submit and track Meta WhatsApp template approvals</p>
      </div>
      <button style={{background:C.accent,border:"none",color:"#fff",padding:"8px 16px",borderRadius:7,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Plus size={12}/>Create Template</button>
    </div>
    <div style={{display:"flex",gap:12,marginBottom:22}}>
      {[["Approved",TEMPLATES.filter(t=>t.status==="approved").length,C.green],["Pending",TEMPLATES.filter(t=>t.status==="pending").length,C.accent],["Rejected",TEMPLATES.filter(t=>t.status==="rejected").length,C.red],["Draft",TEMPLATES.filter(t=>t.status==="draft").length,C.muted]].map(([l,v,col])=>(
        <div key={l} style={{background:C.card,border:"1px solid "+C.border,borderRadius:11,padding:"13px 18px",flex:1}}>
          <p style={{fontSize:10,color:C.muted,marginBottom:5}}>{l}</p>
          <p style={{fontSize:22,fontWeight:700,color:col,fontFamily:"'Syne',sans-serif"}}>{v}</p>
        </div>
      ))}
    </div>
    <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,overflow:"hidden"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead>
          <tr style={{borderBottom:"1px solid "+C.border}}>
            {["Template Name","Category","Brand","Status","Submitted","Approved","Uses","Actions"].map(h=>(
              <th key={h} style={{padding:"11px 14px",fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.8,textAlign:"left"}}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TEMPLATES.map(t=>(
            <tr key={t.id} style={{borderBottom:"1px solid "+C.border}}>
              <td style={{padding:"13px 14px"}}><span style={{fontFamily:"monospace",fontSize:11,color:C.accent,background:C.accent+"10",padding:"2px 7px",borderRadius:5}}>{t.name}</span></td>
              <td style={{padding:"13px 14px"}}><span style={{fontSize:10,color:C.blue,background:"#0f1e38",padding:"2px 7px",borderRadius:10}}>{t.cat}</span></td>
              <td style={{padding:"13px 14px",fontSize:11,color:C.muted}}>{t.brand}</td>
              <td style={{padding:"13px 14px"}}><TBadge status={t.status}/></td>
              <td style={{padding:"13px 14px",fontSize:10,color:C.dim}}>{t.sub||"—"}</td>
              <td style={{padding:"13px 14px",fontSize:10,color:t.apv?C.green:C.dim}}>{t.apv||"—"}</td>
              <td style={{padding:"13px 14px",fontSize:12,color:C.text,fontWeight:600}}>{t.uses}</td>
              <td style={{padding:"13px 14px"}}>
                <div style={{display:"flex",gap:5}}>
                  <button style={{background:"transparent",border:"1px solid "+C.border,borderRadius:5,color:C.muted,padding:"3px 9px",fontSize:9}}>Preview</button>
                  {t.status==="rejected"&&<button style={{background:"transparent",border:"1px solid "+C.red+"40",borderRadius:5,color:C.red,padding:"3px 9px",fontSize:9}}>Resubmit</button>}
                  {t.status==="draft"&&<button style={{background:C.accent+"20",border:"1px solid "+C.accentDim,borderRadius:5,color:C.accent,padding:"3px 9px",fontSize:9}}>Submit</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AIBrainView = () => {
  const [brand,setBrand] = useState("BM Academy");
  const [tab,setTab] = useState("product");
  const PROMPT = "You are a friendly WhatsApp sales assistant for BM Academy.\n\nRULES:\n- Keep replies SHORT (max 4-5 lines)\n- Be warm and natural, not robotic\n- Always end with ONE question\n- Respond in same language as lead\n\nPRODUCT: Digital Marketing, Full Stack Dev, Video Editing courses.\nPLACEMENT: 80% placed in 60 days.\n\nQUALIFYING ORDER:\n1. Which course interests you?\n2. Student or working professional?\n3. Joining this month or next?\n\nFLAGS:\n- PAYMENT_READY when lead agrees to pay\n- CALL_REQUESTED when lead wants call\n- LEAD_COLD after 3 failed attempts";

  return (
    <div style={{padding:26,overflowY:"auto",height:"100%"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:C.text}}>AI Brain Configuration</h1>
          <p style={{color:C.muted,fontSize:12,marginTop:2}}>Configure what each brand AI agent knows and how it closes</p>
        </div>
        <select value={brand} onChange={e=>setBrand(e.target.value)} style={{background:C.card,border:"1px solid "+C.border,borderRadius:7,color:C.text,padding:"8px 12px",fontSize:12,outline:"none"}}>
          {BRANDS.slice(1).map(b=><option key={b}>{b}</option>)}
        </select>
      </div>
      <div style={{background:C.accent+"10",border:"1px solid "+C.accentDim,borderRadius:11,padding:"11px 15px",marginBottom:18,display:"flex",alignItems:"center",gap:9}}>
        <Brain size={15} color={C.accent}/>
        <p style={{fontSize:12,color:C.accent}}>AI Agent for <strong>{brand}</strong> is <strong>Active</strong> - 142 conversations handled - Last updated May 18</p>
      </div>
      <div style={{display:"flex",gap:2,background:C.card,border:"1px solid "+C.border,borderRadius:9,overflow:"hidden",marginBottom:18,width:"fit-content"}}>
        {["product","pricing","objections","proof","flow","prompt"].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 15px",fontSize:11,fontWeight:600,border:"none",background:tab===t?C.accent:"transparent",color:tab===t?"#fff":C.muted,textTransform:"capitalize"}}>
            {t==="flow"?"Conv Flow":t==="prompt"?"System Prompt":t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>
      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:22}}>
        {tab==="product" && (
          <div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Product Info</h3>
            <textarea defaultValue={"BM Academy - skill-based training in Pondicherry.\n\nCourses:\n- Digital Marketing Pro (3 months)\n- Full Stack Development (4 months)\n- Video Editing Professional (45 days)\n\nMode: Offline + Online\nPlacement: Yes - dedicated placement cell\nCertification: Google, Meta certified"} style={{width:"100%",height:180,background:C.surface,border:"1px solid "+C.border,borderRadius:7,color:C.text,padding:13,fontSize:12,outline:"none",resize:"vertical",lineHeight:1.7}}/>
          </div>
        )}
        {tab==="pricing" && (
          <div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Pricing Table</h3>
            {[["Video Editing","Rs 4,999","Rs 2,999","Rs 999 + Rs 2,000"],["Digital Marketing","Rs 8,999","Rs 5,999","Rs 1,999 + Rs 4,000"],["Full Stack Dev","Rs 18,000","Rs 15,000","Rs 5,000 x 3"]].map((p,i)=>(
              <div key={i} style={{display:"flex",gap:11,marginBottom:11,padding:13,background:C.surface,borderRadius:9,border:"1px solid "+C.border,alignItems:"center"}}>
                <div style={{flex:1}}><p style={{fontSize:12,fontWeight:600,color:C.text}}>{p[0]}</p></div>
                <div style={{textAlign:"center"}}><p style={{fontSize:9,color:C.muted}}>Original</p><p style={{fontSize:12,color:C.dim,textDecoration:"line-through"}}>{p[1]}</p></div>
                <div style={{textAlign:"center"}}><p style={{fontSize:9,color:C.muted}}>Offer</p><p style={{fontSize:12,color:C.green,fontWeight:700}}>{p[2]}</p></div>
                <div style={{textAlign:"center"}}><p style={{fontSize:9,color:C.muted}}>EMI</p><p style={{fontSize:11,color:C.blue}}>{p[3]}</p></div>
                <button style={{background:"transparent",border:"1px solid "+C.border,borderRadius:5,color:C.muted,padding:"3px 8px",fontSize:9}}><Edit2 size={9}/></button>
              </div>
            ))}
            <button style={{background:"transparent",border:"1px dashed "+C.border,borderRadius:9,color:C.muted,padding:"9px",width:"100%",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><Plus size={12}/>Add Pricing Tier</button>
          </div>
        )}
        {tab==="objections" && (
          <div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Objection Bank</h3>
            {[["Too expensive","We have EMI - Rs 999 to start, rest after placement. Zero risk."],["Will think about it","Batch starts Monday, 3 seats left. Shall I hold one for 24 hours?"],["Free content online","Free content gives info. We give placement + live projects. Different outcome."],["Not sure I will get a job","Last batch: 8 out of 10 placed in 60 days. Want to see their LinkedIn?"]].map((o,i)=>(
              <div key={i} style={{marginBottom:13,background:C.surface,border:"1px solid "+C.border,borderRadius:9,overflow:"hidden"}}>
                <div style={{padding:"9px 13px",background:"#2d1010",borderBottom:"1px solid "+C.border}}><p style={{fontSize:11,color:C.red,fontWeight:600}}>Objection: {o[0]}</p></div>
                <div style={{padding:"9px 13px"}}><p style={{fontSize:12,color:C.green}}>AI Reply: {o[1]}</p></div>
              </div>
            ))}
          </div>
        )}
        {tab==="proof" && (
          <div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Proof Bank</h3>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
              {[["Placement Stat","8 out of 10 students placed within 60 days in last batch"],["Salary Proof","Student Ragul placed at Rs 18,000/month after 45-day course"],["Google Reviews","4.8 stars with 47 reviews - screenshot shareable"],["Batch Photo","Completion photo from April 2026 cohort - 24 students"]].map((p,i)=>(
                <div key={i} style={{background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:13}}>
                  <p style={{fontSize:9,color:C.accent,fontWeight:700,letterSpacing:0.8,marginBottom:5}}>{p[0]}</p>
                  <p style={{fontSize:12,color:C.text,lineHeight:1.6}}>{p[1]}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==="flow" && (
          <div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Conversation Flow</h3>
            {[["Q1","Which course are you interested in?",["Digital Marketing","Full Stack Dev","Video Editing"]],["Q2","Are you a student or working professional?",["Student","Working Professional","Job Seeker"]],["Q3","Looking to join this month or next month?",["This Month","Next Month","Just Exploring"]]].map((q,i)=>(
              <div key={i} style={{display:"flex",gap:11,marginBottom:13,alignItems:"flex-start"}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:C.accent+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.accent,flexShrink:0}}>{q[0]}</div>
                <div style={{flex:1,background:C.surface,border:"1px solid "+C.border,borderRadius:9,padding:13}}>
                  <p style={{fontSize:12,color:C.text,marginBottom:7}}>{q[1]}</p>
                  <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                    {q[2].map((o,j)=><span key={j} style={{background:C.blue+"20",color:C.blue,padding:"2px 9px",borderRadius:11,fontSize:10}}>{j+1} {o}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==="prompt" && (
          <div>
            <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:14}}>Generated System Prompt</h3>
            <div style={{background:C.accent+"08",border:"1px solid "+C.accentDim,borderRadius:7,padding:11,marginBottom:13}}>
              <p style={{fontSize:11,color:C.accent}}>Auto-compiled from your inputs. Used by GPT-4o for every conversation.</p>
            </div>
            <textarea readOnly value={PROMPT} style={{width:"100%",height:260,background:C.surface,border:"1px solid "+C.border,borderRadius:7,color:"#10b981",padding:13,fontSize:11,outline:"none",fontFamily:"monospace",lineHeight:1.8,resize:"none"}}/>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"flex-end",gap:9,marginTop:18,paddingTop:18,borderTop:"1px solid "+C.border}}>
          <button style={{background:"transparent",border:"1px solid "+C.border,borderRadius:7,color:C.muted,padding:"7px 14px",fontSize:12}}>Reset</button>
          <button style={{background:C.accent,border:"none",borderRadius:7,color:"#fff",padding:"7px 18px",fontSize:12,fontWeight:700}}>Save and Activate</button>
        </div>
      </div>
    </div>
  );
};

const ReportsView = () => (
  <div style={{padding:26,overflowY:"auto",height:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <div>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:C.text}}>Reports and Analytics</h1>
        <p style={{color:C.muted,fontSize:12,marginTop:2}}>Full performance overview - all brands - May 2026</p>
      </div>
      <button style={{background:C.card,border:"1px solid "+C.border,color:C.muted,padding:"7px 13px",borderRadius:7,fontSize:12,display:"flex",alignItems:"center",gap:5}}><Download size={12}/>Export PDF</button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:20}}>
        <SH title="Weekly Lead Volume"/>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={W7} barSize={18} barGap={3}>
            <XAxis dataKey="d" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={{background:C.card,border:"1px solid "+C.border,borderRadius:7,fontSize:11}}/>
            <Bar dataKey="l" name="Leads" fill={C.accent} radius={[4,4,0,0]}/>
            <Bar dataKey="c" name="Converted" fill={C.green} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:20}}>
        <SH title="Revenue Growth"/>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={REV}>
            <XAxis dataKey="m" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>"Rs "+(v/1000)+"K"} tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip formatter={v=>"Rs "+(v/1000).toFixed(0)+"K"} contentStyle={{background:C.card,border:"1px solid "+C.border,borderRadius:7,fontSize:11}}/>
            <Line type="monotone" dataKey="r" stroke={C.blue} strokeWidth={2.5} dot={{fill:C.blue,r:3}}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div style={{background:C.card,border:"1px solid "+C.border,borderRadius:14,padding:20}}>
      <SH title="Brand-Wise Summary"/>
      {[["BM Academy",287,34,"12%","Rs 94K",C.accent],["BM TechX",134,18,"13%","Rs 72K",C.blue],["EduConsultants",89,7,"8%","Rs 35K",C.purple],["Real Estate",76,4,"5%","Rs 20K",C.green]].map(b=>(
        <div key={b[0]} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:b[5],flexShrink:0}}/>
          <div style={{width:150}}><p style={{fontSize:12,fontWeight:600,color:C.text}}>{b[0]}</p></div>
          <div style={{flex:1,height:5,background:C.border,borderRadius:2}}><div style={{height:"100%",width:((b[1]/287)*100)+"%",background:b[5],borderRadius:2}}/></div>
          <div style={{width:55,textAlign:"right"}}><p style={{fontSize:11,color:C.text,fontWeight:600}}>{b[1]}</p><p style={{fontSize:9,color:C.muted}}>leads</p></div>
          <div style={{width:50,textAlign:"right"}}><p style={{fontSize:11,color:C.green,fontWeight:600}}>{b[3]}</p><p style={{fontSize:9,color:C.muted}}>conv</p></div>
          <div style={{width:70,textAlign:"right"}}><p style={{fontSize:11,color:C.accent,fontWeight:600}}>{b[4]}</p></div>
        </div>
      ))}
    </div>
  </div>
);

const ClientsView = () => (
  <div style={{padding:26,overflowY:"auto",height:"100%"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
      <div>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:C.text}}>Client Management</h1>
        <p style={{color:C.muted,fontSize:12,marginTop:2}}>External businesses using LeadOS via BM TechX</p>
      </div>
      <button style={{background:C.accent,border:"none",color:"#fff",padding:"8px 16px",borderRadius:7,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}><Plus size={12}/>Onboard Client</button>
    </div>
    <div style={{display:"flex",gap:12,marginBottom:22}}>
      {[["Active","3",C.green],["Monthly Recurring","Rs 48K",C.accent],["Total Leads Managed","935",C.blue],["Avg Conversion","18%",C.purple]].map(([l,v,col])=>(
        <div key={l} style={{background:C.card,border:"1px solid "+C.border,borderRadius:11,padding:"14px 18px",flex:1}}>
          <p style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:0.8,marginBottom:5}}>{l}</p>
          <p style={{fontSize:20,fontWeight:700,color:col,fontFamily:"'Syne',sans-serif"}}>{v}</p>
        </div>
      ))}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      {CLIENTS.map(cl=>(
        <div key={cl.id} style={{background:C.card,border:"1px solid "+(cl.status==="active"?C.border:C.dim),borderRadius:14,padding:20,opacity:cl.status==="inactive"?0.65:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <div style={{width:42,height:42,borderRadius:11,background:C.accent+"20",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:C.accent}}>{cl.name[0]}</div>
              <div>
                <p style={{fontSize:13,fontWeight:700,color:C.text}}>{cl.name}</p>
                <p style={{fontSize:10,color:C.muted}}>{cl.type} - {cl.joined}</p>
              </div>
            </div>
            <span style={{background:cl.status==="active"?"#0a2018":"#1a1a1a",color:cl.status==="active"?C.green:C.muted,padding:"3px 9px",borderRadius:12,fontSize:10,fontWeight:600}}>{cl.status==="active"?"Active":"Inactive"}</span>
          </div>
          <div style={{display:"flex",gap:11,marginBottom:14}}>
            {[["Leads",cl.leads,C.blue],["Converted",cl.conv,C.green],["Monthly","Rs "+(cl.rev/1000).toFixed(0)+"K",C.accent]].map(([l,v,col])=>(
              <div key={l} style={{flex:1,background:C.surface,borderRadius:7,padding:"9px 11px",textAlign:"center"}}>
                <p style={{fontSize:16,fontWeight:700,color:col,fontFamily:"'Syne',sans-serif"}}>{v}</p>
                <p style={{fontSize:9,color:C.muted,marginTop:2}}>{l}</p>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:7}}>
            <button style={{flex:1,background:"transparent",border:"1px solid "+C.border,borderRadius:7,color:C.muted,padding:"6px",fontSize:11}}>Dashboard</button>
            <button style={{flex:1,background:C.accent+"20",border:"1px solid "+C.accentDim,borderRadius:7,color:C.accent,padding:"6px",fontSize:11,fontWeight:600}}>Manage</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SettingsView = () => {
  const [tab,setTab] = useState("account");
  return (
    <div style={{padding:26,overflowY:"auto",height:"100%"}}>
      <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:21,fontWeight:800,color:C.text,marginBottom:22}}>Settings</h1>
      <div style={{display:"flex",gap:18}}>
        <div style={{width:180}}>
          {[["account","Account"],["whatsapp","WhatsApp API"],["team","Team"],["notifications","Alerts"],["billing","Billing"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{width:"100%",textAlign:"left",padding:"9px 13px",borderRadius:7,border:"none",background:tab===k?C.accent+"20":"transparent",color:tab===k?C.accent:C.muted,fontSize:12,fontWeight:tab===k?600:400,marginBottom:1}}>
              {tab===k && <span style={{marginRight:5}}>›</span>}{l}
            </button>
          ))}
        </div>
        <div style={{flex:1,background:C.card,border:"1px solid "+C.border,borderRadius:13,padding:22}}>
          {tab==="account" && (
            <div>
              <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:18}}>Account Settings</h3>
              {[["Business Name","ABM Groups"],["Portal Name","LeadOS by BM TechX"],["Admin Email","kamar@abmgroups.org"],["Contact","94038 92971"],["Website","bmtechx.in"]].map(([l,v])=>(
                <div key={l} style={{marginBottom:14}}>
                  <label style={{display:"block",fontSize:9,color:C.muted,marginBottom:5,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{l}</label>
                  <input defaultValue={v} style={{width:"100%",background:C.surface,border:"1px solid "+C.border,borderRadius:7,color:C.text,padding:"9px 11px",fontSize:12,outline:"none"}}/>
                </div>
              ))}
            </div>
          )}
          {tab==="whatsapp" && (
            <div>
              <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:18}}>WhatsApp API Connection</h3>
              <div style={{background:"#0a2018",border:"1px solid #16523a",borderRadius:9,padding:13,marginBottom:18,display:"flex",alignItems:"center",gap:9}}>
                <CheckCircle size={13} color={C.green}/><p style={{fontSize:12,color:C.green}}>WhatsApp Business API connected - +91 94038 92971 - Quality: High</p>
              </div>
              {[["Phone Number ID","1234567890123456"],["Access Token","EAABxxxxxx..."],["Webhook URL","https://api.bmtechx.in/webhook/whatsapp"],["Verify Token","abm_verify_xxxx"]].map(([l,v])=>(
                <div key={l} style={{marginBottom:13}}>
                  <label style={{display:"block",fontSize:9,color:C.muted,marginBottom:5,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>{l}</label>
                  <div style={{display:"flex",gap:7}}>
                    <input defaultValue={v} style={{flex:1,background:C.surface,border:"1px solid "+C.border,borderRadius:7,color:C.text,padding:"8px 11px",fontSize:11,outline:"none",fontFamily:"monospace"}}/>
                    <button style={{background:"transparent",border:"1px solid "+C.border,borderRadius:7,color:C.muted,padding:"0 11px"}}><Copy size={11}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab==="notifications" && (
            <div>
              <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text,marginBottom:18}}>Alert Settings</h3>
              {[["Hot lead detected","Send WhatsApp alert to assigned team",true],["Payment received","Notify admin and team member",true],["Daily summary report","Sent at 9 PM every day",true],["AI agent failure","Immediate alert",false]].map(([l,d,on])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:"1px solid "+C.border}}>
                  <div><p style={{fontSize:12,color:C.text,fontWeight:500}}>{l}</p><p style={{fontSize:10,color:C.muted,marginTop:2}}>{d}</p></div>
                  <div style={{width:38,height:20,borderRadius:10,background:on?C.accent:C.border,position:"relative",cursor:"pointer"}}>
                    <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:2,left:on?20:2,transition:"left 0.15s"}}/>
                  </div>
                </div>
              ))}
            </div>
          )}
          {(tab==="team"||tab==="billing") && <div style={{textAlign:"center",padding:36,color:C.muted}}><Brain size={28} color={C.muted} style={{margin:"0 auto 11px"}}/><p>Available in full deployment</p></div>}
          {tab!=="billing"&&tab!=="team"&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:18,paddingTop:18,borderTop:"1px solid "+C.border}}>
            <button style={{background:C.accent,border:"none",borderRadius:7,color:"#fff",padding:"8px 18px",fontSize:12,fontWeight:700}}>Save Changes</button>
          </div>}
        </div>
      </div>
    </div>
  );
};

// ── NAVIGATION ────────────────────────────────────────────
const NAV = [
  {id:"dashboard",Icon:Home,label:"Dashboard"},
  {id:"leads",Icon:Users,label:"Leads"},
  {id:"inbox",Icon:Inbox,label:"Inbox",badge:3},
  {id:"campaigns",Icon:Zap,label:"Campaigns"},
  {id:"templates",Icon:FileText,label:"Templates"},
  {id:"brain",Icon:Brain,label:"AI Brain"},
  {id:"reports",Icon:BarChart2,label:"Reports"},
  {id:"clients",Icon:Building2,label:"Clients"},
];

const Sidebar = ({active,setActive,onLogout}) => (
  <div style={{width:62,background:C.surface,borderRight:"1px solid "+C.border,display:"flex",flexDirection:"column",alignItems:"center",padding:"14px 0",height:"100vh",flexShrink:0}}>
    <div style={{width:38,height:38,background:"linear-gradient(135deg,"+C.accent+",#ea580c)",borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:"#fff",marginBottom:22}}>L</div>
    <div style={{flex:1,display:"flex",flexDirection:"column",gap:1,width:"100%",padding:"0 7px"}}>
      {NAV.map(n=>(
        <button key={n.id} onClick={()=>setActive(n.id)} title={n.label} style={{width:"100%",height:42,borderRadius:9,border:"none",background:active===n.id?C.accent+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",position:"relative",transition:"background 0.1s"}}>
          <n.Icon size={17} color={active===n.id?C.accent:C.muted}/>
          {n.badge && <div style={{position:"absolute",top:6,right:6,width:13,height:13,borderRadius:"50%",background:C.accent,fontSize:8,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{n.badge}</div>}
        </button>
      ))}
    </div>
    <div style={{padding:"0 7px",display:"flex",flexDirection:"column",gap:1,width:"100%"}}>
      <button onClick={()=>setActive("settings")} title="Settings" style={{width:"100%",height:42,borderRadius:9,border:"none",background:active==="settings"?C.accent+"22":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><Settings size={17} color={active==="settings"?C.accent:C.muted}/></button>
      <button onClick={onLogout} title="Logout" style={{width:"100%",height:42,borderRadius:9,border:"none",background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><LogOut size={15} color={C.muted}/></button>
    </div>
  </div>
);

const Header = ({active}) => {
  const labels = {dashboard:"Dashboard",leads:"Lead Management",inbox:"WhatsApp Inbox",campaigns:"Bulk Campaigns",templates:"Templates",brain:"AI Brain",reports:"Reports",clients:"Clients",settings:"Settings"};
  return (
    <div style={{height:54,background:C.surface,borderBottom:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",flexShrink:0}}>
      <div>
        <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:700,color:C.text}}>{labels[active]}</span>
        <span style={{color:C.dim,fontSize:12,marginLeft:7}}>- LeadOS by BM TechX</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:7,background:C.card,border:"1px solid "+C.border,borderRadius:7,padding:"6px 11px"}}>
          <Search size={11} color={C.muted}/>
          <input placeholder="Quick search..." style={{background:"transparent",border:"none",color:C.text,fontSize:11,outline:"none",width:150}}/>
        </div>
        <button style={{position:"relative",width:34,height:34,borderRadius:7,background:C.card,border:"1px solid "+C.border,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Bell size={14} color={C.muted}/>
          <div style={{position:"absolute",top:7,right:7,width:6,height:6,borderRadius:"50%",background:C.accent}}/>
        </button>
        <div style={{display:"flex",alignItems:"center",gap:7,background:C.card,border:"1px solid "+C.border,borderRadius:7,padding:"5px 11px"}}>
          <div style={{width:22,height:22,borderRadius:"50%",background:"linear-gradient(135deg,"+C.accent+",#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"#fff"}}>K</div>
          <div><p style={{fontSize:10,fontWeight:600,color:C.text}}>Kamar</p><p style={{fontSize:8,color:C.muted}}>Super Admin</p></div>
        </div>
      </div>
    </div>
  );
};

// ── APP ROOT ─────────────────────────────────────────────
export default function App() {
  const [loggedIn,setLoggedIn] = useState(false);
  const [active,setActive] = useState("dashboard");
  const [selectedLead,setSelectedLead] = useState(null);
  const [email,setEmail] = useState("kamar@abmgroups.org");
  const [pass,setPass] = useState("");

  if(!loggedIn) return (
    <>
      <style>{STYLE}</style>
      <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 25% 25%, rgba(249,115,22,0.05) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59,130,246,0.05) 0%, transparent 50%)"}}/>
        <div style={{background:C.surface,border:"1px solid "+C.border,borderRadius:18,padding:46,width:410,position:"relative",boxShadow:"0 0 80px rgba(0,0,0,0.6)"}}>
          <div style={{textAlign:"center",marginBottom:34}}>
            <div style={{width:54,height:54,background:"linear-gradient(135deg,"+C.accent+",#ea580c)",borderRadius:15,display:"inline-flex",alignItems:"center",justifyContent:"center",fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:800,color:"#fff",marginBottom:14}}>L</div>
            <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:800,color:C.text}}>LeadOS</h1>
            <p style={{color:C.muted,fontSize:11,marginTop:4}}>ABM Groups - Powered by BM TechX</p>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:9,color:C.muted,marginBottom:6,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",background:C.bg,border:"1px solid "+C.border,borderRadius:9,padding:"11px 14px",color:C.text,fontSize:13,outline:"none"}}/>
          </div>
          <div style={{marginBottom:26}}>
            <label style={{display:"block",fontSize:9,color:C.muted,marginBottom:6,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Password</label>
            <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="Enter password" style={{width:"100%",background:C.bg,border:"1px solid "+C.border,borderRadius:9,padding:"11px 14px",color:C.text,fontSize:13,outline:"none"}}/>
          </div>
          <button onClick={()=>setLoggedIn(true)} style={{width:"100%",background:"linear-gradient(135deg,"+C.accent+",#ea580c)",border:"none",borderRadius:9,padding:14,color:"#fff",fontSize:13,fontWeight:700,boxShadow:"0 4px 20px rgba(249,115,22,0.3)"}}>
            Sign In to LeadOS
          </button>
          <p style={{textAlign:"center",color:C.dim,fontSize:10,marginTop:18}}>Demo - click Sign In</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{STYLE}</style>
      <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
        <Sidebar active={active} setActive={setActive} onLogout={()=>setLoggedIn(false)}/>
        <div style={{display:"flex",flexDirection:"column",flex:1,overflow:"hidden"}}>
          <Header active={active}/>
          <div style={{flex:1,overflow:"hidden"}}>
            {active==="dashboard" && <Dashboard/>}
            {active==="leads"     && <LeadsView onLeadClick={setSelectedLead}/>}
            {active==="inbox"     && <InboxView/>}
            {active==="campaigns" && <CampaignsView/>}
            {active==="templates" && <TemplatesView/>}
            {active==="brain"     && <AIBrainView/>}
            {active==="reports"   && <ReportsView/>}
            {active==="clients"   && <ClientsView/>}
            {active==="settings"  && <SettingsView/>}
          </div>
        </div>
        {selectedLead && <LeadModal lead={selectedLead} onClose={()=>setSelectedLead(null)}/>}
      </div>
    </>
  );
}
