import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/main";

// Define the Notification interface matching our schema
interface Notification {
  notification_id: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const UV_NotificationCenter: React.FC = () => {
  // Retrieve necessary global store values and actions via Zustand
  const token = useAppStore((state) => state.auth_state.token);
  const notifications = useAppStore((state) => state.notification_state.notifications);
  const setNotifications = useAppStore((state) => state.set_notifications);
  const clearNotificationsAction = useAppStore((state) => state.clear_notifications);

  const queryClient = useQueryClient();

  // Base URL for axios calls using VITE env variable with fallback.
  const baseUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}`;

  // Function to fetch notifications from backend
  const fetchNotifications = async (): Promise<Notification[]> => {
    const response = await axios.get(`${baseUrl}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // The response is expected to have { notifications: [...] }
    return response.data.notifications;
  };

  // Using useQuery to fetch notifications on page load and on manual refresh
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Notification[], Error>({
    queryKey: ["notifications"],
    queryFn: fetchNotifications,
    onSuccess: (data) => {
      // Update global state with fetched notifications
      setNotifications(data);
    },
  });

  // Mutation for toggling the read/unread status of a notification
  const toggleReadMutation = useMutation(
    async (payload: { notification_id: string; is_read: boolean }) => {
      const { notification_id, is_read } = payload;
      const response = await axios.put(
        `${baseUrl}/api/notifications/${notification_id}`,
        { is_read },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    {
      onSuccess: () => {
        // After toggling, refetch notifications to update UI
        queryClient.invalidateQueries(["notifications"]);
      },
    }
  );

  // Function to handle toggling notification status
  const handleToggleRead = (notification: Notification) => {
    toggleReadMutation.mutate({
      notification_id: notification.notification_id,
      is_read: !notification.is_read,
    });
  };

  // Function to handle clearing notifications from the view (local clear)
  const handleClearNotifications = () => {
    clearNotificationsAction();
  };

  // Helper: determine an icon based on the notification_type
  const getIconForType = (type: string) => {
    switch (type) {
      case "assignment":
        return "📌";
      case "comment":
        return "💬";
      case "update":
        return "🔄";
      case "deadline":
        return "⏰";
      default:
        return "🔔";
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Notification Center</h1>
          <div>
            <button
              onClick={() => refetch()}
              className="mr-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
            <button
              onClick={() => handleClearNotifications()}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear All
            </button>
          </div>
        </div>
        {isLoading && (
          <div className="text-center text-gray-600">Loading notifications...</div>
        )}
        {isError && (
          <div className="text-center text-red-500">Error: {error?.message}</div>
        )}
        {!isLoading && notifications.length === 0 && (
          <div className="text-center text-gray-600">
            No notifications available.{" "}
            <Link className="text-blue-500 underline" to="/dashboard">
              Back to Dashboard
            </Link>
          </div>
        )}
        <ul>
          {notifications.map((notification) => (
            <li key={notification.notification_id}>
              <div className="flex items-center justify-between border border-gray-200 p-3 rounded mb-3 shadow-sm">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getIconForType(notification.notification_type)}</span>
                  <div>
                    <p className={`${notification.is_read ? "text-gray-500" : "font-semibold"}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => handleToggleRead(notification)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
                  >
                    {notification.is_read ? "Mark Unread" : "Mark Read"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default UV_NotificationCenter;