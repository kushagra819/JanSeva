import { apiClient } from './client';
import type { AnalyticsSummary, DepartmentCode, Grievance, GrievanceStatus, MapIssue, Priority, User } from '../types';

export interface QueueFilters {
  query?: string;
  status?: string;
  priority?: string;
  departmentCode?: string;
}

const queryString = (filters: QueueFilters) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  const value = params.toString();
  return value ? `?${value}` : '';
};

export const getStaffGrievances = (filters: QueueFilters = {}) =>
  apiClient<Grievance[]>(`/staff/grievances${queryString(filters)}`);

export const reviewGrievance = (
  id: string,
  decision: 'APPROVE' | 'OVERRIDE',
  overrideDepartmentCode?: DepartmentCode,
  message?: string
) => apiClient<Grievance>(`/grievances/${id}/review`, {
  method: 'POST',
  body: JSON.stringify({ decision, overrideDepartmentCode, message })
});

export const assignGrievance = (id: string, officerId: string) =>
  apiClient<Grievance>(`/staff/grievances/${id}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ officerId })
  });

export const updateGrievanceStatus = (id: string, status: GrievanceStatus, message?: string) =>
  apiClient<Grievance>(`/staff/grievances/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, message })
  });

export const getStaffMapIssues = () => apiClient<MapIssue[]>('/staff/map/issues');
export const getAnalyticsSummary = () => apiClient<AnalyticsSummary>('/analytics/summary');
export const getAssignableOfficers = () => apiClient<User[]>('/staff/officers');

export interface CreateStaffPayload {
  name: string;
  email: string;
  password: string;
  role: 'OFFICER' | 'DEPARTMENT_HEAD' | 'ADMIN' | 'COMMISSIONER';
  departmentCode?: DepartmentCode;
}

export interface AuditEvent {
  id: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: string;
  createdAt: string;
}

export const getAdminUsers = () => apiClient<User[]>('/admin/users');
export const createStaffUser = (payload: CreateStaffPayload) => apiClient<User>('/admin/users', {
  method: 'POST',
  body: JSON.stringify(payload)
});
export const getAuditEvents = () => apiClient<AuditEvent[]>('/admin/audit');

export const statusOptions: GrievanceStatus[] = [
  'RECEIVED', 'PROCESSING', 'PENDING_REVIEW', 'ROUTED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'
];

export const priorityOptions: Priority[] = ['NORMAL', 'HIGH', 'EMERGENCY'];
export const departmentOptions: DepartmentCode[] = [
  'ROADS', 'WATER', 'ELECTRICITY', 'SANITATION', 'PUBLIC_SAFETY',
  'PARKS_HORTICULTURE', 'HEALTH', 'BUILDING_URBAN_PLANNING', 'TRANSPORT', 'PUBLIC_SERVICES'
];

export const nextStatuses: Record<GrievanceStatus, GrievanceStatus[]> = {
  RECEIVED: ['PROCESSING'],
  PROCESSING: ['PENDING_REVIEW', 'ROUTED'],
  PENDING_REVIEW: ['ROUTED', 'REJECTED'],
  ROUTED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['ROUTED', 'RESOLVED'],
  RESOLVED: [],
  REJECTED: []
};
