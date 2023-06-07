import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "@timesheeter/app/utils/api";

import "@timesheeter/app/styles/globals.css";
import { NotificationProvider } from "@timesheeter/app/components/ui/notification/NotificationProvider";

const MyApp: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <SessionProvider session={session}>
      <NotificationProvider>
        <Component {...pageProps} />
      </NotificationProvider>
    </SessionProvider>
  );
};

export default api.withTRPC(MyApp);
