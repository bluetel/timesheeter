import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import router from "next/router";

export default function Logout() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session) {
      void signOut().then(() => {
        void router.push("/");
      });
    } else {
      void router.push("/");
    }
  }, [session]);

  return (
    <></>
  );
}
