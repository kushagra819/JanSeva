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
  return apiClient<Array<Omit<Notification, 'isRead'> & { readAt?: string | null }>>('/notifications')
    .then(notifications => notifications.map(notification => ({
      ...notification,
      isRead: Boolean(notification.readAt)
    })));
};

export const markNotificationAsRead = (id: string) => {
  return apiClient<void>(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
};
