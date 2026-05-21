/**
 * LeadOS API Client
 * Base URL from environment: VITE_API_URL
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://leados-api.abmgroups.org';

class LeadOSAPI {
  constructor() {
    this.token = localStorage.getItem('leados_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('leados_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('leados_token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearToken();
      window.location.href = '/login';
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API Error');
    }

    return data;
  }

  // ─── AUTH ───────────────────────────────
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async changePassword(current, newPassword) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current, newPassword }),
    });
  }

  // ─── LEADS ──────────────────────────────
  async getLeads(filters = {}) {
    const params = new URLSearchParams({
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      ...(filters.status && { status: filters.status }),
      ...(filters.brand && { brand: filters.brand }),
      ...(filters.search && { search: filters.search }),
    });
    return this.request(`/api/leads?${params}`);
  }

  async getLead(id) {
    return this.request(`/api/leads/${id}`);
  }

  async createLead(leadData) {
    return this.request('/api/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
  }

  async updateLead(id, updates) {
    return this.request(`/api/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // ─── WHATSAPP ───────────────────────────
  async sendWhatsAppMessage(leadId, message) {
    return this.request('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId, message }),
    });
  }

  // ─── TEMPLATES ──────────────────────────
  async getTemplates() {
    return this.request('/api/templates');
  }

  async createTemplate(templateData) {
    return this.request('/api/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });
  }

  // ─── CAMPAIGNS ──────────────────────────
  async getCampaigns() {
    return this.request('/api/campaigns');
  }

  async createCampaign(campaignData) {
    return this.request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });
  }

  // ─── CLIENTS (Brands) ───────────────────
  async getClients() {
    return this.request('/api/clients');
  }

  async getClient(id) {
    return this.request(`/api/clients/${id}`);
  }

  async updateClient(id, clientData) {
    return this.request(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(clientData),
    });
  }

  // ─── PAYMENTS ───────────────────────────
  async createPaymentLink(leadId, amount, description) {
    return this.request('/api/payments/create-link', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId, amount, description }),
    });
  }

  async getPayments(filters = {}) {
    const params = new URLSearchParams({
      ...(filters.leadId && { lead_id: filters.leadId }),
    });
    return this.request(`/api/payments?${params}`);
  }

  // ─── AI BRAIN ───────────────────────────
  async getBrainDocs(clientId) {
    const params = new URLSearchParams({
      ...(clientId && { client_id: clientId }),
    });
    return this.request(`/api/brain?${params}`);
  }

  async saveBrainDoc(clientId, docType, content) {
    return this.request('/api/brain', {
      method: 'POST',
      body: JSON.stringify({ client_id: clientId, doc_type: docType, content }),
    });
  }

  // ─── DASHBOARD ──────────────────────────
  async getDashboardStats() {
    return this.request('/api/reports/summary');
  }
}

export const api = new LeadOSAPI();
