import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "@timesheeter/web/utils/api";

import { NotificationProvider } from "@timesheeter/web/components/ui/notification/NotificationProvider";

import "tw-elements/dist/css/tw-elements.min.css";

// This needs to be the last css import
import "@timesheeter/web/styles/globals.css";

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
