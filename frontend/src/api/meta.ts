import { apiClient } from './client';

export interface MetaData {
  departments: Array<{ code: string; name: string; description: string }>;
  taxonomy: Array<{ code: string; name: string; departmentCode: string }>;
  statuses: Array<{ code: string; name: string }>;
  thresholds: {
    maxAttachmentSizeMB: number;
    allowedAttachmentTypes: string[];
  };
}

export const getMeta = () => {
  return apiClient<MetaData>('/meta');
};
