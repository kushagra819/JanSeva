import { apiClient } from './client';

export interface Notification {
  id: string;
  userId: string;
  grievanceId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const getNotifications = () => {
  return apiClient<Notification[]>('/notifications');
};

export const markNotificationAsRead = (id: string) => {
  return apiClient<void>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
};
