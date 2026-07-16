import { apiClient } from './client';
import type { Grievance, AIAnalysis, TimelineEvent } from '../types';

export interface SubmitGrievancePayload {
  description: string;
  language: string;
  district: string;
  locality: string;
  latitude?: number;
  longitude?: number;
}

export const submitGrievance = (payload: SubmitGrievancePayload, idempotencyKey: string) => {
  return apiClient<Grievance>('/grievances', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
};

export const getMyGrievances = () => {
  return apiClient<Grievance[]>('/grievances/mine');
};

export const getGrievanceById = (id: string) => {
  return apiClient<Grievance>(`/grievances/${id}`);
};

export const analyzeGrievance = (id: string) => {
  return apiClient<{ analysisId: string }>(`/grievances/${id}/analyze`, {
    method: 'POST',
  });
};

export const getGrievanceAnalysis = (id: string) => {
  return apiClient<AIAnalysis>(`/grievances/${id}/analysis`);
};

export const uploadGrievanceAttachment = (id: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiClient<{ success: boolean; url: string }>(`/grievances/${id}/attachments`, {
    method: 'POST',
    body: formData,
  });
};

export const getGrievanceTimeline = (id: string) => {
  return apiClient<TimelineEvent[]>(`/grievances/${id}/timeline`);
};
