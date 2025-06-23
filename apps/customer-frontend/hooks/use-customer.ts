'use client';

import { useState, useEffect } from 'react';

export function useCustomer() {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedCustomerId = localStorage.getItem('customerId');
    setCustomerId(storedCustomerId);
    setIsLoading(false);
  }, []);

  const login = (id: string) => {
    localStorage.setItem('customerId', id);
    setCustomerId(id);
  };

  const logout = () => {
    localStorage.removeItem('customerId');
    setCustomerId(null);
  };

  return {
    customerId,
    isLoading,
    isAuthenticated: !!customerId,
    login,
    logout,
  };
}
