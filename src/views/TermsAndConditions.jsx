import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export function TermsAndConditions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', width: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: '#060c17', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header Bar */}
      <header style={{
        background: '#0c1525',
        borderBottom: '1px solid #1a2e4a',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate(user ? '/dashboard' : '/')}>
          <div style={{
            width: 38,
            height: 38,
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Syne', sans-serif",
            fontWeight: 800,
            fontSize: 20,
            color: '#fff'
          }}>L</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: '#f8fafc', lineHeight: 1.1 }}>LeadOS</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>ABM Groups - Powered by BM TechX</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/privacy-policy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
            Privacy Policy
          </Link>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/')}
            style={{
              background: 'linear-gradient(135deg, #f97316, #ea580c)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(249,115,22,0.2)'
            }}>
            {user ? 'Dashboard' : 'Sign In'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{
          background: '#0c1525',
          border: '1px solid #1a2e4a',
          borderRadius: 20,
          padding: '40px 48px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          {/* Document Header */}
          <div style={{ borderBottom: '1px solid #1a2e4a', pb: 24, marginBottom: 32 }}>
            <span style={{
              background: 'rgba(249,115,22,0.12)',
              color: '#f97316',
              border: '1px solid rgba(249,115,22,0.3)',
              borderRadius: 20,
              padding: '4px 14px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              display: 'inline-block',
              marginBottom: 12
            }}>
              Legal Agreement
            </span>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: '#f8fafc', margin: '0 0 8px 0' }}>
              Terms & Conditions
            </h1>
          </div>

          <article style={{ lineHeight: 1.7, fontSize: 14, color: '#cbd5e1' }}>
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', borderLeft: '4px solid #f97316', paddingLeft: 12, marginBottom: 14 }}>
                1. Acceptance of Terms
              </h2>
              <p>
                These Terms and Conditions ("Terms") govern your access to and use of the <strong>LeadOS</strong> platform, website, applications, and services operated by <strong>ABM Groups - Powered by BM TechX</strong> ("we," "us," or "our").
              </p>
              <p style={{ marginTop: 12 }}>
                By creating an account, logging in, accessing, or using any part of LeadOS, you agree to be bound by these Terms. If you do not agree to all of these Terms, you must not use or access our services.
              </p>
            </section>

            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', borderLeft: '4px solid #f97316', paddingLeft: 12, marginBottom: 14 }}>
                2. Description of Services
              </h2>
              <p>
                LeadOS provides a cloud-based Software-as-a-Service (SaaS) platform designed for lead management, customer relationship management (CRM), AI-driven customer intelligence, message automation, and WhatsApp API communication tools.
              </p>
              <ul style={{ paddingLeft: 20, margin: '12px 0' }}>
                <li>Lead qualification, tracking, and pipeline management</li>
                <li>AI Brain analytics and automated interaction suggestions</li>
                <li>Messaging integrations including WhatsApp Business API</li>
                <li>Campaign tracking, reporting, and team collaboration tools</li>
              </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', borderLeft: '4px solid #f97316', paddingLeft: 12, marginBottom: 14 }}>
                3. User Account Responsibilities
              </h2>
              <p>
                To access LeadOS features, you must maintain active and valid credentials. You are responsible for:
              </p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>Maintaining the strict confidentiality of your login credentials</li>
                <li>All activities, data entries, and communications conducted under your account</li>
                <li>Promptly notifying ABM Groups Support of any unauthorized account access</li>
              </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', borderLeft: '4px solid #f97316', paddingLeft: 12, marginBottom: 14 }}>
                4. Acceptable Use Policy & Compliance
              </h2>
              <p>
                You agree not to use LeadOS for any unlawful purpose or in violation of third-party policies. Specifically, you agree:
              </p>
              <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
                <li>Not to send unsolicited bulk messages (spam) or violate Meta/WhatsApp Business Terms</li>
                <li>Not to upload or store harmful code, malware, or unlawful content</li>
                <li>Not to reverse engineer, decompile, or attempt to extract source code of LeadOS</li>
                <li>To obtain appropriate consent from contacts before sending communications</li>
              </ul>
            </section>

            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', borderLeft: '4px solid #f97316', paddingLeft: 12, marginBottom: 14 }}>
                5. Subscriptions, Fees & Payments
              </h2>
              <p>
                Access to certain features or plans requires a valid subscription. All fees are specified in your subscription agreement or order details. Fees are payable in advance and are non-refundable except as explicitly required by law or agreed in writing.
              </p>
            </section>

            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', borderLeft: '4px solid #f97316', paddingLeft: 12, marginBottom: 14 }}>
                6. Intellectual Property Rights
              </h2>
              <p>
                All rights, titles, and interests in LeadOS, including software code, interfaces, logos, trademarks ("LeadOS", "ABM Groups", "BM TechX"), and documentation are owned exclusively by ABM Groups and its licensors. You retain ownership of all lead data and content uploaded by you.
              </p>
            </section>

            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', borderLeft: '4px solid #f97316', paddingLeft: 12, marginBottom: 14 }}>
                7. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, ABM Groups and BM TechX shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, arising out of your use of or inability to use the platform.
              </p>
            </section>

            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', borderLeft: '4px solid #f97316', paddingLeft: 12, marginBottom: 14 }}>
                8. Governing Law & Jurisdiction
              </h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of <strong>Puducherry, India</strong>. Any legal dispute or claim arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Puducherry, India.
              </p>
            </section>

            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', borderLeft: '4px solid #f97316', paddingLeft: 12, marginBottom: 14 }}>
                9. Contact Information
              </h2>
              <div style={{ background: '#060c17', border: '1px solid #1a2e4a', borderRadius: 12, padding: 20, marginTop: 16 }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#f8fafc', fontSize: 15 }}>Legal & Support Contacts</h4>
                <div style={{ fontSize: 13, color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div><strong>Company:</strong> ABM Groups - Powered by BM TechX</div>
                  <div><strong>Email:</strong> <a href="mailto:admin@abmgroups.org" style={{ color: '#f97316' }}>admin@abmgroups.org</a></div>
                  <div><strong>Address:</strong> 252, 2nd Floor, MG Road, Kottakuppam, Vanur, Puducherry, 605104</div>
                  <div><strong>Phone:</strong> +91 9944940051</div>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1a2e4a', background: '#060c17', padding: '24px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
        © {new Date().getFullYear()} LeadOS by ABM Groups - Powered by BM TechX. All rights reserved.
      </footer>
    </div>
  );
}

export default TermsAndConditions;
