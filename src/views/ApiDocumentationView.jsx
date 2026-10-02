import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Terminal, FileCode2, Copy, CheckCircle2, Code2, Layers } from "lucide-react";

export function ApiDocumentationView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("javascript");
  const [copied, setCopied] = useState(false);

  const endpoint = "https://leados-api.abmgroups.org/api/alliance/external/whatsapp/send";

  const codeExamples = {
    javascript: {
      name: "JavaScript / Node.js",
      code: `const apiUrl = \`${endpoint}?apikey=my_super_secret_key_123&project=My_Automation&number=\${customerPhone}&template=\${templateName}&parameters=\${customerName}\`;

// Using Fetch API to send the request
fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('Message Dispatched:', data))
.catch(error => console.error('Transmission Error:', error));`
    },
    python: {
      name: "Python",
      code: `import requests

# Set the API endpoint
url = "${endpoint}"

# Build the payload directly as a JSON body (Recommended)
payload = {
    "apikey": "my_super_secret_key_123",
    "project": "My_Automation",
    "number": customerPhone_variable,
    "template": templateName_variable,
    "parameters": [customerName_variable]
}

# Send POST request
response = requests.post(url, json=payload)
print(response.json())`
    },
    curl: {
      name: "cURL (Make/Zapier)",
      code: `curl -X POST "${endpoint}" \\
-H "Content-Type: application/json" \\
-d '{
  "apikey": "my_super_secret_key_123",
  "project": "My_Automation",
  "number": "919952787198",
  "template": "welcome_qualifier",
  "parameters": ["Kamar"]
}'`
    },
    php: {
      name: "PHP",
      code: `<?php
$url = "${endpoint}";

// Prepare the payload array
$data = array(
    "apikey" => "my_super_secret_key_123",
    "project" => "My_Automation",
    "number" => $customerPhone,
    "template" => $templateName,
    "parameters" => array($customerName)
);

// Initialize cURL session
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));

// Execute and close
$response = curl_exec($ch);
curl_close($ch);

echo $response;
?>`
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeExamples[activeTab].code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ 
      padding: "32px",
      color: "#e2e8f0", 
      fontFamily: "Inter, sans-serif",
      width: "100%"
    }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Navigation / Header */}
        <div style={{ marginBottom: "32px" }}>
          <button 
            onClick={() => navigate('/alliance-tracker')}
            style={{ background: "transparent", border: "none", color: "#94a3b8", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "500", padding: 0, marginBottom: "20px", transition: "color 0.2s" }}
            onMouseOver={e => e.currentTarget.style.color="#f8fafc"}
            onMouseOut={e => e.currentTarget.style.color="#94a3b8"}
          >
            <ArrowLeft size={16} /> Back to Tracker
          </button>
          
          <h1 style={{ fontSize: "32px", fontWeight: "700", margin: "0 0 12px 0", letterSpacing: "-0.025em", color: "#f8fafc", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "8px", background: "rgba(56, 189, 248, 0.1)", borderRadius: "10px" }}><Code2 size={24} color="#38bdf8" /></div>
            API Integration Guide
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "16px", margin: 0, maxWidth: "600px", lineHeight: "1.6" }}>
            Learn how to programmatically dispatch WhatsApp messages via the LeadOS Alliance Meta Graph connection using your preferred programming language.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "32px" }}>
          
          {/* Main Code Section */}
          <div style={{ flex: "1 1 600px", minWidth: 0, background: "#0c1525", border: "1px solid #1a2e4a", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
            
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #1a2e4a", background: "#080e1a", overflowX: "auto" }}>
              {Object.keys(codeExamples).map(key => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    padding: "16px 24px",
                    background: activeTab === key ? "#0c1525" : "transparent",
                    color: activeTab === key ? "#f8fafc" : "#64748b",
                    border: "none",
                    borderBottom: activeTab === key ? "2px solid #38bdf8" : "2px solid transparent",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: activeTab === key ? "600" : "500",
                    transition: "0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    whiteSpace: "nowrap"
                  }}
                  onMouseOver={e => { if (activeTab !== key) e.currentTarget.style.color = "#cbd5e1"; }}
                  onMouseOut={e => { if (activeTab !== key) e.currentTarget.style.color = "#64748b"; }}
                >
                  {key === 'curl' ? <Terminal size={16} /> : <FileCode2 size={16} />}
                  {codeExamples[key].name}
                </button>
              ))}
            </div>

            {/* Code Block and Top Bar */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", background: "rgba(0,0,0,0.2)", borderBottom: "1px solid #1a2e4a" }}>
                <button 
                  onClick={copyToClipboard}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1a2e4a", color: "#e2e8f0", padding: "6px 14px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", transition: "all 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.background="rgba(255,255,255,0.1)"}
                  onMouseOut={e => e.currentTarget.style.background="rgba(255,255,255,0.05)"}
                >
                  {copied ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                  {copied ? "Copied!" : "Copy Code"}
                </button>
              </div>
              <div style={{ overflowX: "auto", padding: "24px", background: "#060b14" }}>
                <pre style={{ margin: 0, fontSize: "14px", color: "#a8b5c8", lineHeight: "1.7", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {codeExamples[activeTab].code}
                </pre>
              </div>
            </div>
          </div>

          {/* Side Info */}
          <div style={{ flex: "1 1 300px", minWidth: 0, display: "flex", flexDirection: "column", gap: "24px" }}>
            
            <div style={{ background: "#0c1525", border: "1px solid #1a2e4a", borderRadius: "12px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <Layers size={18} color="#38bdf8" />
                <h3 style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "#f8fafc" }}>Required Parameters</h3>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
                <li style={{ fontSize: "13px" }}>
                  <code style={{ color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "2px 6px", borderRadius: "4px" }}>apikey</code>
                  <div style={{ color: "#94a3b8", marginTop: "4px" }}>Your secure LeadOS API key.</div>
                </li>
                <li style={{ fontSize: "13px" }}>
                  <code style={{ color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "2px 6px", borderRadius: "4px" }}>number</code>
                  <div style={{ color: "#94a3b8", marginTop: "4px" }}>Customer WhatsApp number with country code.</div>
                </li>
                <li style={{ fontSize: "13px" }}>
                  <code style={{ color: "#38bdf8", background: "rgba(56,189,248,0.1)", padding: "2px 6px", borderRadius: "4px" }}>template</code>
                  <div style={{ color: "#94a3b8", marginTop: "4px" }}>The approved Meta Template name (e.g. <i>welcome_qualifier</i>).</div>
                </li>
              </ul>
            </div>

            <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "12px", padding: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 8px 0", color: "#10b981" }}>Pro Tip</h3>
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: 0, lineHeight: "1.5" }}>
                You can send the parameters as URL query strings (like in the JavaScript example) OR as a JSON body (like in the Python/cURL examples). The server automatically parses both formats seamlessly!
              </p>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
