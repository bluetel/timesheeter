import { createContext, useCallback, useContext, useState } from "react";
import { type NotificationProps, Notification } from "./Notification";

export type Notification = Omit<
  NotificationProps,
  "onUnmount" | "show" | "setShow"
>;

type NotifcationState = NotificationProps & {
  id: string;
};

type NotificationContext = {
  addNotification: (notification: Notification) => unknown;
};

const NotificationContext = createContext<NotificationContext>({
  addNotification: () => undefined,
});

export const useNotifications = () => useContext(NotificationContext);

const MAX_NOTIFICATIONS = 3 as const;

type NotificationProviderProps = {
  children: React.ReactNode;
};

export const NotificationProvider = ({
  children,
}: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<NotifcationState[]>([]);

  const addNotification = useCallback(
    (notification: Notification) => {
      const id = Math.random().toString(36);

      setNotifications((notifications) => [
        {
          ...notification,
          id,
          onUnmount: () =>
            setNotifications((notifications) =>
              notifications.filter((n) => n.id !== id)
            ),
          show: false,
          setShow: (show) =>
            setNotifications((notifications) =>
              notifications.map((n) => {
                if (n.id === id) {
                  return {
                    ...n,
                    show,
                  };
                }

                return n;
              })
            ),
        },
        ...notifications.slice(-MAX_NOTIFICATIONS + 1),
      ]);
    },
    [setNotifications]
  );

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      {/* Global notification live region, render this permanently at the end of the document */}
      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6"
      >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          {notifications.map((notification) => (
            <Notification key={notification.id} {...notification} />
          ))}
        </div>
      </div>
    </NotificationContext.Provider>
  );
};
