import { createClient } from "@midday/supabase/client";
import { HeadlessService, IMessage } from "@novu/headless";
import { useCallback, useEffect, useRef, useState } from "react";

export function useNotifications() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState([]);
  const [subscriberId, setSubscriberId] = useState();
  const headlessServiceRef = useRef<HeadlessService>();

  const markAllMessagesAsRead = () => {
    const headlessService = headlessServiceRef.current;

    if (headlessService) {
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => {
          return {
            ...notification,
            read: true,
          };
        }),
      );

      headlessService.markAllMessagesAsRead({
        listener: (result) => {
          console.log(result);
        },
        onError: (error) => {
          console.error("Error marking all messages as read:", error);
        },
      });
    }
  };

  const markMessageAsRead = (messageId: string) => {
    const headlessService = headlessServiceRef.current;

    if (headlessService) {
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => {
          if (notification.id === messageId) {
            return {
              ...notification,
              read: true,
            };
          }

          return notification;
        }),
      );

      headlessService.markNotificationsAsRead({
        messageId: [messageId],
        listener: (result) => {},
        onError: (error) => {},
      });
    }
  };

  const fetchNotifications = useCallback(() => {
    const headlessService = headlessServiceRef.current;

    if (headlessService) {
      headlessService.fetchNotifications({
        listener: ({
          data,
          error,
          isError,
          isFetching,
          isLoading,
          status,
        }) => {},
        onSuccess: (response) => {
          setNotifications(response.data);
        },
      });
    }
  }, []);

  const markAllMessagesAsSeen = () => {
    const headlessService = headlessServiceRef.current;

    if (headlessService) {
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => ({
          ...notification,
          seen: true,
        })),
      );
      headlessService.markAllMessagesAsSeen({
        listener: (result) => {},
        onError: (error) => {},
      });
    }
  };

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSubscriberId(session?.user.id);
    }

    fetchUser();
  }, [supabase]);

  useEffect(() => {
    const headlessService = headlessServiceRef.current;

    if (headlessService) {
      headlessService.listenNotificationReceive({
        listener: () => {
          fetchNotifications();
        },
      });
    }
  }, [headlessServiceRef.current]);

  useEffect(() => {
    if (subscriberId && !headlessServiceRef.current) {
      const headlessService = new HeadlessService({
        applicationIdentifier: process.env.NEXT_PUBLIC_APPLICATION_IDENTIFIER!,
        subscriberId,
      });

      headlessService.initializeSession({
        listener: (res) => {},
        onSuccess: () => {
          headlessServiceRef.current = headlessService;
          fetchNotifications();
        },
        onError: (error) => {
          console.log("headlessSice error:", error);
        },
      });
    }
  }, [fetchNotifications, subscriberId]);

  return {
    markAllMessagesAsRead,
    markMessageAsRead,
    markAllMessagesAsSeen,
    hasUnseenNotificaitons: notifications.some(
      (notification) => !notification.seen,
    ),
    notifications,
  };
}
