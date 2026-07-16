export type Role = 'CITIZEN' | 'OFFICER' | 'DEPARTMENT_HEAD' | 'ADMIN' | 'COMMISSIONER';

export type GrievanceStatus = 
  | 'RECEIVED'
  | 'PROCESSING'
  | 'PENDING_REVIEW'
  | 'ROUTED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export type Priority = 'NORMAL' | 'HIGH' | 'EMERGENCY';

export type DepartmentCode = 'ELECTRICITY' | 'WATER' | 'ROADS' | 'SANITATION' | 'PUBLIC_SERVICES';

export type Channel = 'WEB' | 'MOBILE' | 'CALL_CENTRE' | 'EMAIL';

export interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string>;
  traceId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  departmentCode?: DepartmentCode;
}

export interface Grievance {
  id: string;
  trackingCode: string;
  description: string;
  language: string;
  district: string;
  locality: string;
  latitude?: number;
  longitude?: number;
  status: GrievanceStatus;
  priority: Priority;
  departmentCode?: DepartmentCode;
  taxonomyCode?: string;
  channel: Channel;
  citizenId: string;
  createdAt: string;
  updatedAt: string;
  hasAttachment?: boolean;
}

export interface AIAnalysis {
  grievanceId: string;
  provider: string;
  modelVersion: string;
  taxonomyCode: string;
  departmentCode: DepartmentCode;
  confidence: number;
  priority: Priority;
  priorityReason: string;
  urgentReasons: string[];
  explanation: string;
  topPredictions: Array<{
    departmentCode: DepartmentCode;
    taxonomyCode: string;
    confidence: number;
  }>;
  decision: 'AUTO_ROUTE' | 'HUMAN_REVIEW' | string;
  requiresHumanReview: boolean;
}

export interface TimelineEvent {
  id: string;
  grievanceId: string;
  type: 'SYSTEM' | 'CITIZEN' | 'STAFF';
  status: GrievanceStatus;
  note?: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
