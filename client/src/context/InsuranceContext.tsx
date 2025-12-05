import React, { createContext, useContext, useState } from 'react';

type InsuranceContextType = {
  verticalFilter: string;
  setVerticalFilter: (vertical: string) => void;
};

const InsuranceContext = createContext<InsuranceContextType | undefined>(undefined);

export function InsuranceProvider({ children }: { children: React.ReactNode }) {
  const [verticalFilter, setVerticalFilter] = useState(() => {
    const saved = localStorage.getItem('insuranceVerticalFilter');
    return saved || 'all';
  });

  const handleSetVerticalFilter = (vertical: string) => {
    setVerticalFilter(vertical);
    localStorage.setItem('insuranceVerticalFilter', vertical);
  };

  return (
    <InsuranceContext.Provider value={{ verticalFilter, setVerticalFilter: handleSetVerticalFilter }}>
      {children}
    </InsuranceContext.Provider>
  );
}

export function useInsurance() {
  const ctx = useContext(InsuranceContext);
  if (!ctx) throw new Error('useInsurance must be used within InsuranceProvider');
  return ctx;
}
