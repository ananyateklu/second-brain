import { useContext } from 'react';
import { DashboardContext } from '../utils/dashboardContextUtils';

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
} 