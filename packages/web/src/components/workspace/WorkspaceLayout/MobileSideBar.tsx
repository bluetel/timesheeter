import type { WorkspaceInfo } from "@timesheeter/web/server/lib/workspace-info";
import {
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import Link from "next/link";
import { classNames } from "@timesheeter/web/utils/tailwind";
import Image from "next/image";
import { navigation } from "./navigation";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

type MobileSideBarProps = {
  workspaceInfo: WorkspaceInfo;
  sideBarOpen: boolean;
  setSideBarOpen: (open: boolean) => void;
}

export const MobileSideBar = ({
  workspaceInfo: { workspace },
  sideBarOpen,
  setSideBarOpen,
}: MobileSideBarProps) => {
  const { pathname } = useRouter();

  return <Transition.Root show={sideBarOpen} as={Fragment}>
    <Dialog
      as="div"
      className="relative z-40 lg:hidden"
      onClose={setSideBarOpen}
    >
      <Transition.Child
        as={Fragment}
        enter="transition-opacity ease-linear duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-linear duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
      </Transition.Child>
      <div className="fixed inset-0 z-40 flex">
        <Transition.Child
          as={Fragment}
          enter="transition ease-in-out duration-300 transform"
          enterFrom="-translate-x-full"
          enterTo="translate-x-0"
          leave="transition ease-in-out duration-300 transform"
          leaveFrom="translate-x-0"
          leaveTo="-translate-x-full"
        >
          <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-white focus:outline-none">
            <Transition.Child
              as={Fragment}
              enter="ease-in-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in-out duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSideBarOpen(false)}
                >
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon
                    className="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </Transition.Child>
            <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
              <div className="flex flex-shrink-0 items-center px-4">
                <Link href="/" className="group block">
                  <Image
                    alt="logo"
                    className="h-8 w-auto"
                    src="/images/logo.png"
                    width={32}
                    height={32}
                  />
                </Link>
              </div>
              <WorkspaceSwitcher activeWorkspace={{
                id: workspace.id,
                name: workspace.name,
              }} />
              <nav aria-label="Sidebar" className="mt-5">
                <div className="space-y-1 px-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={`/workspace/${workspace.id}${item.path}`}
                      className={classNames(
                        pathname.endsWith(item.path)
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        "group flex items-center rounded-md px-2 py-2 text-base font-medium"
                      )}
                    >
                      <item.icon
                        className={classNames(
                          pathname.endsWith(item.path)
                            ? "text-gray-500"
                            : "text-gray-400 group-hover:text-gray-500",
                          "mr-4 h-6 w-6"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </Dialog.Panel>
        </Transition.Child>
        <div className="w-14 flex-shrink-0" aria-hidden="true">
          {/* Force sidebar to shrink to fit close icon */}
        </div>
      </div>
    </Dialog>
  </Transition.Root>
}