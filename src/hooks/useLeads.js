import { useState, useEffect } from 'react';
import { api } from '../services/api.js';

export const useLeads = (filters = {}) => {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const limit = filters.limit || 20;
  const offset = filters.offset || 0;

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLeads({ ...filters, limit, offset });
      setLeads(data.leads || []);
      setTotal(data.total || 0);
      setHasMore((data.leads || []).length === limit);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreLeads = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const currentOffset = leads.length;
      const data = await api.getLeads({ ...filters, limit, offset: currentOffset });
      const newLeads = data.leads || [];
      if (newLeads.length > 0) {
        setLeads(prev => {
          // Prevent duplicates just in case
          const existingIds = new Set(prev.map(l => l.id));
          return [...prev, ...newLeads.filter(l => !existingIds.has(l.id))];
        });
      }
      setHasMore(newLeads.length === limit);
    } catch (err) {
      console.error('Failed to load more leads:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filters.status, filters.brand, filters.search, filters.limit, filters.offset]);

  return { leads, total, loading, loadingMore, hasMore, error, refetch: fetchLeads, loadMoreLeads };
};

export const useLead = (id) => {
  const [lead, setLead] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const limit = 100;

  const fetchLead = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLead(id);
      setLead(data.lead);
      
      // Fetch initial messages
      const msgData = await api.getMessages(id, limit, 0);
      setConversations(msgData.messages || []);
      setHasMore((msgData.messages || []).length === limit);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!id || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const offset = conversations.length;
      const data = await api.getMessages(id, limit, offset);
      const newMessages = data.messages || [];
      if (newMessages.length > 0) {
        // Prepend older messages
        setConversations(prev => [...newMessages, ...prev]);
      }
      setHasMore(newMessages.length === limit);
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setConversations([]);
    setHasMore(true);
    fetchLead();
  }, [id]);

  return { lead, conversations, loading, loadingMore, hasMore, error, refetch: fetchLead, loadMoreMessages };
};

export const useAllianceInbox = () => {
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const data = await api.getAllianceInbox();
      setInbox(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  return { inbox, loading, error, refetch: fetchInbox };
};

export const useAllianceLead = (id) => {
  const [lead, setLead] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLead = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAllianceLead(id);
      setLead(data.lead);
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLead();
  }, [id]);

  return { lead, conversations, loading, error, refetch: fetchLead };
};
