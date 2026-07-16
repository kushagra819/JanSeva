import { apiClient } from './client';
import type { AIAnalysis, DepartmentCode, Grievance, MapIssue } from '../types';

export const getPublicMapIssues = () => apiClient<MapIssue[]>('/public/map/issues');

export interface PublicIssueDetail extends MapIssue {
  description: string;
  hasPublicImage: boolean;
  publicImageUrl?: string;
  timeline: Array<{ eventType: string; status?: string; message: string; createdAt: string }>;
}

export const getPublicIssueDetail = (id: string) => apiClient<PublicIssueDetail>(`/public/map/issues/${id}`);

export interface SpeechTranscription {
  text: string;
  language: string;
  languageProbability: number;
  durationSeconds: number;
  provider: 'faster-whisper';
  model: string;
}

export const transcribePublicAudio = async (audio: Blob, language: string): Promise<SpeechTranscription> => {
  const form = new FormData();
  const extension = audio.type.includes('ogg') ? 'ogg' : audio.type.includes('mp4') ? 'm4a' : 'webm';
  form.append('audio', audio, `janseva-voice.${extension}`);
  form.append('language', language);
  const response = await fetch('/speech-api/transcribe', { method: 'POST', body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Voice transcription is temporarily unavailable.');
  return data as SpeechTranscription;
};

export const analyzePublicDraft = (text: string) => apiClient<AIAnalysis>('/public/analyze', {
  method: 'POST',
  body: JSON.stringify({ text })
});

export interface PublicReportPayload {
  text: string;
  latitude?: number;
  longitude?: number;
  idempotencyKey: string;
  departmentOverride?: DepartmentCode;
  file?: File;
}

export const submitPublicReport = (payload: PublicReportPayload) => {
  const form = new FormData();
  form.append('report', new Blob([JSON.stringify({
    text: payload.text,
    latitude: payload.latitude,
    longitude: payload.longitude,
    idempotencyKey: payload.idempotencyKey,
    departmentOverride: payload.departmentOverride,
    channel: 'WEB'
  })], { type: 'application/json' }));
  if (payload.file) form.append('file', payload.file);
  return apiClient<{ grievance: Grievance; analysis: AIAnalysis; attachmentUploaded: boolean }>('/public/reports', {
    method: 'POST',
    body: form
  });
};
