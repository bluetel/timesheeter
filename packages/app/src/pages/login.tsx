import { signIn, useSession } from "next-auth/react";
import router, { useRouter } from "next/router";
import { useEffect } from "react";
import { SiDiscord } from "react-icons/si";

export default function Login() {
  const { data: session, status } = useSession();
  const { query, } = useRouter();

  const callbackUrl = query.callbackUrl && typeof query.callbackUrl === "string"
  ? query.callbackUrl : "/find-workspace"

  useEffect(() => {
    if (session && status === "authenticated") {
      void router.push(callbackUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <div className="m-auto mx-auto px-12 xl:container sm:px-0">
      <div className="mx-auto h-full sm:w-max">
        <div className="m-auto  py-12">
          <div className="space-y-4">
            <a href="">
              {/* <Image src="images/tailus.svg" className="w-40 dark:hidden" alt="tailus logo" />
                            <Image src="images/logo.svg" className="w-40 hidden dark:block" alt="tailus logo" /> */}
            </a>
          </div>
          <div className="-mx-6 mt-12 rounded-3xl border bg-gray-50 p-8 dark:border-gray-700 dark:bg-gray-800 sm:-mx-10 sm:p-10">
            <h3 className="text-2xl font-semibold text-gray-700 dark:text-white">
              Login to your account
            </h3>
            <div className="mt-12 flex grid-cols-1 flex-wrap gap-8 sm:grid">
              <button
                className="h-11 w-full rounded-full bg-gray-900 px-6 transition hover:bg-gray-800 focus:bg-gray-700 active:bg-gray-600 dark:border dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-700 dark:hover:bg-gray-800"
                disabled={status === "loading"}
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                onClick={() =>
                  signIn("discord", {
                    callbackUrl,
                  })
                }
              >
                <div className="mx-auto flex w-max items-center justify-between space-x-4 text-white">
                  <SiDiscord className="w-5" />
                  <span className="block w-max text-sm font-semibold tracking-wide text-white">
                    With Discord
                  </span>
                </div>
              </button>
            </div>
          </div>
          <div className="pt-12 text-gray-500 dark:border-gray-800">
            <div className="space-x-4 text-center">
              <span>&copy; ModelHero {new Date().getFullYear()}</span>
              {/* <a href="#" className="text-sm hover:text-sky-900 dark:hover:text-gray-300">Contact</a>
                            <a href="#" className="text-sm hover:text-sky-900 dark:hover:text-gray-300">Privacy & Terms</a> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
