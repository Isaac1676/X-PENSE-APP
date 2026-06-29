import { create } from "zustand";
import {
  addDoc,
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
} from "../firebase";

export interface NotificationInterface {
  id: string;
  message: string;
  type: "budget" | "expense" | "income" | "alert";
  date: string;
  read: boolean;
}

interface NotificationStore {
  notifications: NotificationInterface[];
  markAsRead: (userId: string, notificationId: string) => Promise<void>;
  addNotifications: (
    userId: string,
    notification: Omit<NotificationInterface, "id">
  ) => Promise<void>;
  AllNotifications: (userId: string) => Promise<void>;
  removeNotifications: (
    userId: string,
    notificationId: string
  ) => Promise<void>;
  clearAllNotifications: (userId: string) => Promise<void>;
  // New methods for enhanced functionality
  getNotificationStats: () => {
    total: number;
    unread: number;
    byType: Record<string, number>;
    recent: number;
  };
  getFilteredNotifications: (filter: {
    type?: string;
    read?: boolean;
    dateRange?: { start: string; end: string };
  }) => NotificationInterface[];
  markAllAsRead: (userId: string) => Promise<void>;
  getNotificationsByPriority: () => {
    critical: NotificationInterface[];
    important: NotificationInterface[];
    normal: NotificationInterface[];
  };
}

export const useNotificationStore = create<NotificationStore>()((set, get) => ({
  notifications: [],
  addNotifications: async (userId, notification) => {
    try {
      const notificationRef = collection(db, "users", userId, "notifications");
      const docRef = await addDoc(notificationRef, notification);

      set((state) => ({
        notifications: [
          ...state.notifications,
          { ...notification, id: docRef.id },
        ],
      }));
    } catch (error) {
      console.error("Error adding notifications:", error);
      throw new Error("Could not add notifications");
    }
  },
  AllNotifications: async (userId) => {
    try {
      const q = query(
        collection(db, "users", userId, "notifications"),
        orderBy("date", "desc"),
        limit(50)
      );
      const notificationSnapshots = await getDocs(q);
      const notifications = notificationSnapshots.docs.map((doc) => {
        const data = doc.data();
        return { id: doc.id, ...data } as NotificationInterface;
      });

      set({ notifications });
    } catch (error) {
      console.error("Erreur lors du chargement des notifications :", error);
    }
  },
  markAsRead: async (userId, notificationId) => {
    try {
      const notificationRef = doc(
        db,
        "users",
        userId,
        "notifications",
        notificationId
      );
      await updateDoc(notificationRef, { read: true });
      set((state) => ({
        notifications: state.notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        ),
      }));
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de la notification :",
        error
      );
      throw error;
    }
  },
  removeNotifications: async (userId, notificationId) => {
    try {
      const docRef = doc(db, "users", userId, "notifications", notificationId);
      await deleteDoc(docRef);

      set((state) => ({
        notifications: state.notifications.filter(
          (notification) => notification.id !== notificationId
        ),
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression de la notification:", error);
      throw error;
    }
  },
  clearAllNotifications: async (userId) => {
    try {
      const notificationSnapshots = getDocs(
        collection(db, "users", userId, "notifications")
      );
      const batchPromises = (await notificationSnapshots).docs.map((docItem) =>
        deleteDoc(doc(db, "users", userId, "notifications", docItem.id))
      );

      await Promise.all(batchPromises);
      set({ notifications: [] });
    } catch (error) {
      console.error(
        "Erreur lors de la suppression de toutes les notifications:",
        error
      );
      throw new Error(
        "Erreur lors de la suppression de toutes les notifications"
      );
    }
  },

  // New enhanced methods
  getNotificationStats: () => {
    const { notifications } = get();
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats: {
      total: number;
      unread: number;
      byType: Record<string, number>;
      recent: number;
    } = {
      total: notifications.length,
      unread: notifications.filter((n: NotificationInterface) => !n.read)
        .length,
      byType: {} as Record<string, number>,
      recent: notifications.filter(
        (n: NotificationInterface) => new Date(n.date) >= last24Hours
      ).length,
    };

    notifications.forEach((n: NotificationInterface) => {
      stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
    });

    return stats;
  },

  getFilteredNotifications: (filter: {
    type?: string;
    read?: boolean;
    dateRange?: { start: string; end: string };
  }): NotificationInterface[] => {
    const { notifications } = get();
    return notifications.filter((notification: NotificationInterface) => {
      // Filter by type
      if (filter.type && notification.type !== filter.type) {
        return false;
      }

      // Filter by read status
      if (filter.read !== undefined && notification.read !== filter.read) {
        return false;
      }

      // Filter by date range
      if (filter.dateRange) {
        const notificationDate = new Date(notification.date);
        const startDate = new Date(filter.dateRange.start);
        const endDate = new Date(filter.dateRange.end);

        if (notificationDate < startDate || notificationDate > endDate) {
          return false;
        }
      }

      return true;
    });
  },

  markAllAsRead: async (userId) => {
    try {
      const { notifications } = useNotificationStore.getState();
      const unreadNotifications = notifications.filter((n) => !n.read);

      const updatePromises = unreadNotifications.map(async (notification) => {
        const notificationRef = doc(
          db,
          "users",
          userId,
          "notifications",
          notification.id
        );
        return updateDoc(notificationRef, { read: true });
      });

      await Promise.all(updatePromises);

      set((state) => ({
        notifications: state.notifications.map((notif) => ({
          ...notif,
          read: true,
        })),
      }));
    } catch (error) {
      console.error(
        "Erreur lors du marquage de toutes les notifications:",
        error
      );
      throw error;
    }
  },

  getNotificationsByPriority: () => {
    const { notifications } = useNotificationStore.getState();

    const critical: NotificationInterface[] = [];
    const important: NotificationInterface[] = [];
    const normal: NotificationInterface[] = [];

    notifications.forEach((notification) => {
      // Determine priority based on type and content
      if (
        notification.type === "alert" ||
        notification.message.includes("Budget dépassé") ||
        notification.message.includes("Limite atteinte")
      ) {
        critical.push(notification);
      } else if (
        notification.type === "expense" &&
        (notification.message.includes("élevée") ||
          notification.message.includes("augmentation"))
      ) {
        important.push(notification);
      } else {
        normal.push(notification);
      }
    });

    return { critical, important, normal };
  },
}));
