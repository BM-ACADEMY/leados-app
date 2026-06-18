import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api.js';

const ClientContext = createContext();

export const useClient = () => {
  return useContext(ClientContext);
};

export const ClientProvider = ({ children }) => {
  const [clients, setClients] = useState([]);
  const [plans, setPlans] = useState([]);
  const [activeClient, setActiveClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchGlobalData = async () => {
    try {
      const [clientsData, plansData] = await Promise.all([
        api.get('/thedal/clients'),
        api.get('/thedal/plans')
      ]);
      if (clientsData) setClients(clientsData);
      if (plansData) setPlans(plansData);
    } catch (err) {
      console.error('Failed to load global client data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const value = {
    clients,
    plans,
    activeClient,
    setActiveClient,
    loading,
    refreshGlobalData: fetchGlobalData
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
};
