export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  role: string;
  action: string;
  details?: string;
  module: string;
}

const STORAGE_KEY = 'vape_activity_logs';

export const getActivityLogs = (): ActivityLogEntry[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

export const logActivity = (role: string, action: string, module: string, details?: string) => {
  const logs = getActivityLogs();
  const newLog: ActivityLogEntry = {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    role,
    action,
    module,
    details
  };
  logs.unshift(newLog); // prepend to keep newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  window.dispatchEvent(new Event('activityLogsUpdated'));
};

export const clearActivityLogs = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('activityLogsUpdated'));
};
