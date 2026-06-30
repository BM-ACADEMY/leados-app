import { useState, useEffect } from 'react';
import { api } from '../services/api.js';

export const useLeads = (filters = {}) => {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLeads(filters);
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [filters.status, filters.brand, filters.search]);

  return { leads, total, loading, error, refetch: fetchLeads };
};

export const useLead = (id) => {
  const [lead, setLead] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLead = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getLead(id);
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
