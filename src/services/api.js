/**
 * LeadOS API Client
 * Base URL from environment: VITE_API_URL
 */

const API_URL = import.meta.env.VITE_API_URL || '';

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

  async deleteLead(id) {
    return this.request(`/api/leads/${id}`, {
      method: 'DELETE',
    });
  }

  async getUsers() {
    return this.request('/api/users');
  }

  async getSources() {
    return this.request('/api/leads/sources');
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

  async submitTemplate(id) {
    return this.request(`/api/templates/${id}/submit`, {
      method: 'POST',
    });
  }

  async syncTemplate(id) {
    return this.request(`/api/templates/${id}/sync`, {
      method: 'GET',
    });
  }

  async updateTemplate(id, templateData) {
    return this.request(`/api/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(templateData),
    });
  }

  async deleteTemplate(id) {
    return this.request(`/api/templates/${id}`, {
      method: 'DELETE',
    });
  }

  // ─── INBOX ──────────────────────────────
  async getInbox() {
    return this.request('/api/inbox');
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

  async deleteCampaign(id) {
    return this.request(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  async executeCampaign(id) {
    return this.request(`/api/campaigns/execute`, {
      method: 'POST',
      body: JSON.stringify({ campaign_id: id }),
    });
  }

  async getCampaignLogs(id) {
    return this.request(`/api/campaigns/${id}/logs`);
  }

  // ─── CLIENTS (Brands) ───────────────────
  async getClients() {
    return this.request('/api/clients');
  }

  async createClient(clientData) {
    return this.request('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
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

  async deleteClient(id) {
    return this.request(`/api/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async setupClientWhatsApp(id) {
    return this.request(`/api/clients/${id}/whatsapp-setup`, {
      method: 'POST'
    });
  }

  async importLeads(formData, forceStatus = null) {
    const token = localStorage.getItem('leados_token');
    if (!token) throw new Error('No authentication token found');
    
    if (forceStatus) {
      formData.append('force_status', forceStatus);
    }
    
    // FormData requires a direct fetch because our this.request stringifies the body
    // if the body is an object, and FormData shouldn't be stringified, nor should the
    // Content-Type be set to application/json (browser sets it to multipart/form-data with boundary)
    const response = await fetch(`${API_URL}/api/leads/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
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

  // ─── ALLIANCE OS ────────────────────────
  async uploadAllianceCSV(formData) {
    const token = localStorage.getItem('leados_token');
    if (!token) throw new Error('No authentication token found');
    const response = await fetch(`${API_URL}/api/upload/csv`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getPipeline(type = 'college') {
    return this.request(`/api/pipeline?type=${type}`);
  }

  async analyzeBatch(orgIds) {
    return this.request('/api/analyze/batch', {
      method: 'POST',
      body: JSON.stringify({ orgIds })
    });
  }

  async getKnowledgeBase() {
    return this.request('/api/knowledge');
  }

  async deleteKnowledgeDoc(id) {
    return this.request(`/api/knowledge/${id}`, { method: 'DELETE' });
  }

  async uploadKnowledgeDoc(formData) {
    const token = localStorage.getItem('leados_token');
    if (!token) throw new Error('No authentication token found');
    const response = await fetch(`${API_URL}/api/knowledge/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }
}

export const api = new LeadOSAPI();
