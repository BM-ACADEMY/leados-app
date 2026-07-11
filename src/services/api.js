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
    const dataMode = localStorage.getItem('leados_data_mode') || 'live';
    const headers = {
      'Content-Type': 'application/json',
      'x-data-mode': dataMode,
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

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('API Error: Non-JSON response:', text);
      throw new Error('Received invalid data from server');
    }

    if (!response.ok) {
      throw new Error(data.error || 'API Error');
    }

    return data;
  }

  async get(endpoint, options = {}) {
    const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    return this.request(path, { ...options, method: 'GET' });
  }

  async post(endpoint, body, options = {}) {
    const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    return this.request(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  async put(endpoint, body, options = {}) {
    const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    return this.request(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  async delete(endpoint, options = {}) {
    const path = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;
    return this.request(path, {
      ...options,
      method: 'DELETE'
    });
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
  async sendWhatsAppMessage(leadId, message, mediaUrl = null, msgType = 'text', replyToWaId = null, isForwarded = false) {
    return this.request('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify({ lead_id: leadId, message, media_url: mediaUrl, msg_type: msgType, reply_to_wa_id: replyToWaId, is_forwarded: isForwarded }),
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

  // ─── INBOX & MESSAGES ───────────────────
  async getInbox() {
    return this.request('/api/inbox');
  }

  async readConversation(leadId) {
    return this.request(`/api/conversations/${leadId}/read`, {
      method: 'PUT'
    });
  }

  async editMessage(id, content) {
    return this.request(`/api/messages/${id}/edit`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
  }

  async deleteMessage(id) {
    return this.request(`/api/messages/${id}/delete`, {
      method: 'PUT'
    });
  }

  async pinMessage(id, durationHours) {
    return this.request(`/api/messages/${id}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ duration: durationHours })
    });
  }

  async unpinMessage(id) {
    return this.request(`/api/messages/${id}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ unpin: true })
    });
  }

  async toggleStarMessage(id, isStarred) {
    return this.request(`/api/messages/${id}/star`, {
      method: 'PUT',
      body: JSON.stringify({ is_starred: isStarred })
    });
  }

  async reactToMessage(id, emoji, action = 'add') {
    return this.request(`/api/messages/${id}/react`, {
      method: 'PUT',
      body: JSON.stringify({ emoji, action })
    });
  }

  async uploadMedia(formData, onProgress) {
    const token = localStorage.getItem('leados_token');
    if (!token) throw new Error('No authentication token found');
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/api/messages/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            onProgress(percentComplete);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || `HTTP error! status: ${xhr.status}`));
          } catch (e) {
            reject(new Error(`HTTP error! status: ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
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

  async getAllianceInbox() {
    return this.request('/api/alliance-inbox');
  }

  async getAllianceLead(id) {
    return this.request(`/api/alliance-inbox/${id}`);
  }

  async sendAllianceMessage(orgId, message) {
    return this.request(`/api/alliance-inbox/${orgId}/send`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // ─── CONTENT OS ─────────────────────────
  async getSocialAccounts() {
    return this.request('/api/content/social-accounts');
  }

  async getContentQueue(filters = {}) {
    const query = new URLSearchParams();
    if (filters.status) query.append('status', filters.status);
    if (filters.search) query.append('search', filters.search);
    if (filters.startDate) query.append('startDate', filters.startDate);
    if (filters.endDate) query.append('endDate', filters.endDate);
    
    return this.request(`/api/content?${query.toString()}`);
  }

  async getContentStats() {
    return this.request('/api/content/stats');
  }

  async updateContent(id, updates) {
    return this.request(`/api/content/${id}/edit`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async approveContent(id) {
    return this.request(`/api/content/${id}/approve`, {
      method: 'POST',
    });
  }

  async publishContent(id) {
    return this.request(`/api/content/${id}/publish`, {
      method: 'POST',
    });
  }

  async rejectContent(id, reason) {
    return this.request(`/api/content/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason: reason })
    });
  }

  async generateCaptions(brandName, videoUrl, platforms) {
    return this.request('/api/content/generate-captions', {
      method: 'POST',
      body: JSON.stringify({ brand_name: brandName, video_url: videoUrl, platforms }),
    });
  }

  async createBatchContent(items) {
    return this.request('/api/content/batch', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  async getFolderMonitors() {
    return this.request('/api/content/monitors', {
      method: 'GET',
    });
  }

  async upsertFolderMonitor(brandName, folderId) {
    return this.request('/api/content/monitors', {
      method: 'POST',
      body: JSON.stringify({ brand_name: brandName, folder_id: folderId }),
    });
  }

  async getAiCaptionSuggestions(id, tone = 'engaging', platform = null) {
    return this.request(`/api/content/${id}/suggest-captions`, {
      method: 'POST',
      body: JSON.stringify({ tone, platform })
    });
  }

  async getAiStorySuggestions(id, tone = 'engaging') {
    return this.request(`/api/content/${id}/suggest-stories`, {
      method: 'POST',
      body: JSON.stringify({ tone })
    });
  }
}

export const api = new LeadOSAPI();
