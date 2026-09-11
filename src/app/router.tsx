import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserRole } from './types';
import { useAuth } from './layout/AuthProvider';

export type { UserRole } from './types';

interface RoleContextValue {
  role: UserRole;
  setRole: (role: UserRole) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [roleState, setRoleState] = useState<UserRole>(role);

  useEffect(() => {
    setRoleState(role);
  }, [role]);

  const setRole = (_next: UserRole) => {
    if (import.meta.env.DEV) {
      console.warn('[auth] setRole is disabled — role is fixed by the authenticated session.');
    }
  };

  return <RoleContext.Provider value={{ role: roleState, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}

