import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

// Interfaces for global state

export interface User {
  user_id: string;
  name: string;
  email: string;
  profile_picture: string;
  user_role: string;
}

export interface AuthState {
  token: string;
  user: User | null;
  is_authenticated: boolean;
}

export interface Notification {
  notification_id: string;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationState {
  notifications: Notification[];
  unread_count: number;
}

export interface RealtimeState {
  socket_connected: boolean;
  subscribed_events: string[];
}

export interface GlobalUIState {
  global_error_message: string;
  is_loading_global: boolean;
}

export interface AppStore {
  auth_state: AuthState;
  notification_state: NotificationState;
  realtime_state: RealtimeState;
  global_ui_state: GlobalUIState;
  
  // Actions for auth_state
  set_auth: (data: AuthState) => void;
  clear_auth: () => void;
  
  // Actions for notification_state
  add_notification: (notification: Notification) => void;
  set_notifications: (notifications: Notification[]) => void;
  clear_notifications: () => void;
  increment_unread_count: (count?: number) => void;
  reset_unread_count: () => void;
  
  // Actions for realtime_state
  set_realtime_connected: (connected: boolean) => void;
  add_subscribed_event: (event: string) => void;
  
  // Global UI state actions
  set_global_error_message: (msg: string) => void;
  clear_global_error_message: () => void;
  
  // Realtime initialization action
  init_realtime: (token?: string) => Promise<void>;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Global states with defaults
      auth_state: { token: "", user: null, is_authenticated: false },
      notification_state: { notifications: [], unread_count: 0 },
      realtime_state: { socket_connected: false, subscribed_events: [] },
      global_ui_state: { global_error_message: "", is_loading_global: false },
      
      // Auth actions
      set_auth: (data: AuthState) => set(() => ({ auth_state: data })),
      clear_auth: () => set(() => ({ auth_state: { token: "", user: null, is_authenticated: false } })),
      
      // Notification actions
      add_notification: (notification: Notification) =>
        set((state) => {
          const updated_notifications = [...state.notification_state.notifications, notification];
          const updated_unread_count = state.notification_state.unread_count + (notification.is_read ? 0 : 1);
          return { notification_state: { notifications: updated_notifications, unread_count: updated_unread_count } };
        }),
      set_notifications: (notifications: Notification[]) =>
        set(() => ({
          notification_state: { notifications, unread_count: notifications.filter(n => !n.is_read).length }
        })),
      clear_notifications: () =>
        set(() => ({ notification_state: { notifications: [], unread_count: 0 } })),
      increment_unread_count: (count: number = 1) =>
        set((state) => ({
          notification_state: {
            ...state.notification_state,
            unread_count: state.notification_state.unread_count + count
          }
        })),
      reset_unread_count: () =>
        set((state) => ({
          notification_state: { ...state.notification_state, unread_count: 0 }
        })),
      
      // Realtime actions
      set_realtime_connected: (connected: boolean) =>
        set((state) => ({
          realtime_state: { ...state.realtime_state, socket_connected: connected }
        })),
      add_subscribed_event: (event: string) =>
        set((state) => {
          if (state.realtime_state.subscribed_events.includes(event)) {
            return {};
          }
          return {
            realtime_state: {
              ...state.realtime_state,
              subscribed_events: [...state.realtime_state.subscribed_events, event]
            }
          };
        }),
      
      // Global UI actions
      set_global_error_message: (msg: string) =>
        set((state) => ({
          global_ui_state: { ...state.global_ui_state, global_error_message: msg }
        })),
      clear_global_error_message: () =>
        set((state) => ({
          global_ui_state: { ...state.global_ui_state, global_error_message: "" }
        })),
      
      // Initialize realtime with socket.io connection and event subscriptions
      init_realtime: async (token?: string) => {
        try {
          const auth_token = token || get().auth_state.token;
          const socket_url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}`;
          const socket: Socket = io(socket_url, {
            auth: { token: auth_token },
          });
          
          socket.on('connect', () => {
            set((state) => ({
              realtime_state: { ...state.realtime_state, socket_connected: true }
            }));
          });
          
          socket.on('disconnect', () => {
            set((state) => ({
              realtime_state: { ...state.realtime_state, socket_connected: false }
            }));
          });
          
          // List of global realtime events to subscribe to
          const events = [
            "task_created",
            "task_updated",
            "new_comment",
            "notification_created",
            "task_deleted",
            "assignee_updated"
          ];
          
          events.forEach((eventName) => {
            socket.on(eventName, (payload: any) => {
              // For 'notification_created', update notifications in global state.
              if (eventName === "notification_created") {
                const notification = payload.data as Notification;
                set((state) => {
                  const updated_notifications = [...state.notification_state.notifications, notification];
                  const updated_unread_count = state.notification_state.unread_count + (notification.is_read ? 0 : 1);
                  return {
                    notification_state: { notifications: updated_notifications, unread_count: updated_unread_count }
                  };
                });
              }
              // Additional events can be handled here if necessary.
            });
            // Add event to state subscribed_events list
            set((state) => {
              if (!state.realtime_state.subscribed_events.includes(eventName)) {
                return {
                  realtime_state: {
                    ...state.realtime_state,
                    subscribed_events: [...state.realtime_state.subscribed_events, eventName]
                  }
                };
              }
              return {};
            });
          });
        } catch (error) {
          set((state) => ({
            global_ui_state: { ...state.global_ui_state, global_error_message: "Error initializing realtime connection" }
          }));
        }
      }
    }),
    {
      name: 'taskflow-global-state',
      getStorage: () => localStorage,
    }
  )
);