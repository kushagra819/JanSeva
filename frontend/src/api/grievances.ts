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
    body: JSON.stringify({
      text: payload.description,
      latitude: payload.latitude,
      longitude: payload.longitude,
      idempotencyKey,
      channel: 'WEB'
    }),
  });
};

export const getMyGrievances = () => {
  return apiClient<Grievance[]>('/grievances/mine');
};

export const getGrievanceById = (id: string) => {
  return apiClient<Grievance>(`/grievances/${id}`);
};

export const analyzeGrievance = (id: string, text: string) => {
  return apiClient<AIAnalysis>(`/grievances/${id}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ text }),
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
  return apiClient<Array<{
    id: string;
    grievanceId: string;
    actorId?: string;
    eventType: string;
    oldStatus?: TimelineEvent['status'];
    newStatus?: TimelineEvent['status'];
    publicMessage?: string;
    createdAt: string;
  }>>(`/grievances/${id}/timeline`).then(events => events.map(event => ({
    id: event.id,
    grievanceId: event.grievanceId,
    type: event.eventType === 'CREATED' ? 'CITIZEN' as const : event.eventType === 'ANALYZED' ? 'SYSTEM' as const : 'STAFF' as const,
    status: event.newStatus || event.oldStatus || 'RECEIVED',
    note: event.publicMessage,
    createdAt: event.createdAt
  })));
};
