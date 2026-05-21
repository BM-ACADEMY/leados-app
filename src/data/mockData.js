export const BRANDS = [
  "All Brands","BM Academy","BM TechX","EduConsultants","Real Estate","Haramain","Dada's Kitchen","TravellersNeed"
];

export const LEADS = [
  {id:1,name:"Arjun Kumar",phone:"98765 43210",source:"Meta Ads",brand:"BM Academy",status:"hot",score:87,assigned:"Karthika",time:"2h ago",interest:"Digital Marketing"},
  {id:2,name:"Priya Devi",phone:"98654 32109",source:"Instagram DM",brand:"BM Academy",status:"warm",score:62,assigned:"Satish",time:"5h ago",interest:"Full Stack Dev"},
  {id:3,name:"Mohamed Salim",phone:"98543 21098",source:"Website",brand:"BM TechX",status:"hot",score:91,assigned:"Satish",time:"1h ago",interest:"Clinic Package"},
  {id:4,name:"Kavitha R",phone:"98432 10987",source:"WhatsApp",brand:"EduConsultants",status:"warm",score:55,assigned:"Karthika",time:"1d ago",interest:"MBBS Abroad"},
  {id:5,name:"Ravi Shankar",phone:"98321 09876",source:"Meta Ads",brand:"Real Estate",status:"cold",score:28,assigned:"Satish",time:"3d ago",interest:"Plot Investment"},
  {id:6,name:"Deepa M",phone:"98210 98765",source:"Referral",brand:"BM Academy",status:"converted",score:100,assigned:"Karthika",time:"Yesterday",interest:"Video Editing"},
  {id:7,name:"Suresh P",phone:"98109 87654",source:"Google Sheet",brand:"BM TechX",status:"warm",score:71,assigned:"Satish",time:"3h ago",interest:"Social Media Pack"},
  {id:8,name:"Anitha S",phone:"98098 76543",source:"Meta Ads",brand:"BM Academy",status:"hot",score:83,assigned:"Karthika",time:"30m ago",interest:"Digital Marketing"},
];

export const CONVO = [
  {from:"lead",text:"Hi, saw your ad about digital marketing course",time:"10:23"},
  {from:"ai",text:"Hi Arjun! Thanks for your interest in BM Academy.\n\nWhich course interests you?\n1 Digital Marketing\n2 Full Stack Dev\n3 Video Editing",time:"10:23"},
  {from:"lead",text:"1 - Digital Marketing",time:"10:25"},
  {from:"ai",text:"Great choice! Are you a student or working professional?",time:"10:25"},
  {from:"lead",text:"Final year student",time:"10:27"},
  {from:"ai",text:"Perfect timing!\n\nOur Digital Marketing Pro course:\nLive projects + portfolio\nPlacement support\nGoogle certification\n\nScholarship batch: Rs 2,999 (orig Rs 5,999)\nEMI: Rs 999 now + rest after placement\n\nShall I block a seat?",time:"10:27"},
  {from:"lead",text:"Sounds good! When does batch start?",time:"10:28"},
  {from:"ai",text:"June 2nd — Monday!\nOnly 3 seats remaining.\n\nSend payment link now?",time:"10:29"},
];

export const INBOX = [
  {id:1,name:"Arjun Kumar",brand:"BM Academy",last:"When does batch start?",time:"10:29",unread:1,status:"hot"},
  {id:8,name:"Anitha S",brand:"BM Academy",last:"Ready to pay, send link",time:"10:15",unread:2,status:"hot"},
  {id:3,name:"Mohamed Salim",brand:"BM TechX",last:"Can you do a demo visit?",time:"9:42",unread:0,status:"hot"},
  {id:2,name:"Priya Devi",brand:"BM Academy",last:"Let me check with parents",time:"Yesterday",unread:0,status:"warm"},
  {id:7,name:"Suresh P",brand:"BM TechX",last:"Whats in starter pack?",time:"Yesterday",unread:0,status:"warm"},
];

export const TEMPLATES = [
  {id:1,name:"welcome_qualifier",cat:"UTILITY",status:"approved",brand:"BM Academy",sub:"May 12",apv:"May 14",uses:342},
  {id:2,name:"followup_day3",cat:"MARKETING",status:"approved",brand:"All Brands",sub:"May 10",apv:"May 12",uses:891},
  {id:3,name:"special_offer_academy",cat:"MARKETING",status:"pending",brand:"BM Academy",sub:"May 18",apv:null,uses:0},
  {id:4,name:"call_booking",cat:"UTILITY",status:"approved",brand:"All Brands",sub:"May 10",apv:"May 12",uses:214},
  {id:5,name:"clinic_intro_techx",cat:"UTILITY",status:"rejected",brand:"BM TechX",sub:"May 15",apv:null,uses:0},
];

export const CAMPAIGNS = [
  {id:1,name:"Academy May Batch Fill",brand:"BM Academy",total:245,sent:245,delivered:231,read:187,replied:43,status:"completed",date:"May 15"},
  {id:2,name:"TechX Clinic Outreach",brand:"BM TechX",total:89,sent:89,delivered:84,read:61,replied:18,status:"completed",date:"May 16"},
  {id:3,name:"Real Estate Warm Leads",brand:"Real Estate",total:156,sent:98,delivered:95,read:47,replied:8,status:"running",date:"May 19"},
];

export const CLIENTS = [
  {id:1,name:"Raahath Dental Care",type:"Clinic",plan:"Pro",status:"active",leads:234,conv:28,rev:15000,joined:"Apr 2026"},
  {id:2,name:"Vasanth Academy",type:"Education",plan:"Starter",status:"active",leads:189,conv:31,rev:8000,joined:"May 2026"},
  {id:3,name:"GreenBuild Properties",type:"Real Estate",plan:"Enterprise",status:"active",leads:445,conv:19,rev:25000,joined:"Mar 2026"},
  {id:4,name:"Spice Garden",type:"F&B",plan:"Starter",status:"inactive",leads:67,conv:12,rev:0,joined:"Apr 2026"},
];

export const W7 = [
  {d:"Mon",l:12,c:3},{d:"Tue",l:19,c:5},{d:"Wed",l:15,c:4},{d:"Thu",l:25,c:8},{d:"Fri",l:22,c:7},{d:"Sat",l:31,c:11},{d:"Sun",l:18,c:6}
];

export const REV = [
  {m:"Jan",r:45000},{m:"Feb",r:62000},{m:"Mar",r:58000},{m:"Apr",r:79000},{m:"May",r:94000}
];

export const SRC = [
  {name:"Meta Ads",v:45,c:"#f97316"},{name:"WhatsApp",v:22,c:"#3b82f6"},{name:"Website",v:18,c:"#8b5cf6"},{name:"Instagram",v:10,c:"#ec4899"},{name:"Referral",v:5,c:"#10b981"},
];

export const FNL = [
  {s:"Total Leads",n:142},{s:"Contacted",n:118},{s:"Qualified",n:79},{s:"Hot Leads",n:34},{s:"Converted",n:17},
];

export const NAV = [
  {id:"dashboard",Icon:"Home",label:"Dashboard"},
  {id:"leads",Icon:"Users",label:"Leads"},
  {id:"inbox",Icon:"Inbox",label:"Inbox",badge:3},
  {id:"campaigns",Icon:"Zap",label:"Campaigns"},
  {id:"templates",Icon:"FileText",label:"Templates"},
  {id:"brain",Icon:"Brain",label:"AI Brain"},
  {id:"reports",Icon:"BarChart2",label:"Reports"},
  {id:"clients",Icon:"Building2",label:"Clients"},
];
