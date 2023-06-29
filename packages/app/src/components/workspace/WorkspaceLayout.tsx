/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import React from "react";
import type { WorkspaceInfo } from "@timesheeter/app/server/lib/workspace-info";
import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  Bars3Icon,
  HomeIcon,
  XMarkIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/router";
import Link from "next/link";
import { classNames } from "@timesheeter/app/utils/tailwind";
import Image from "next/image";
import {
  HolidayIcon,
  IntegrationIcon,
  ProjectIcon,
  TaskIcon,
  TimesheetEntryIcon,
} from "@timesheeter/app/lib";

export type WorkspaceLayoutProps = {
  workspaceInfo: WorkspaceInfo;
  secondAside?: React.ReactNode;
  children: React.ReactNode;
};

type NavigationItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className: string }>;
};

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: HomeIcon },
  { name: "Integrations", path: "/integrations", icon: IntegrationIcon },
  { name: "Projects", path: "/projects", icon: ProjectIcon },
  { name: "Tasks", path: "/tasks", icon: TaskIcon },
  {
    name: "Timesheet Entries",
    path: "/timesheet-entries",
    icon: TimesheetEntryIcon,
  },
  { name: "Holidays", path: "/holidays", icon: HolidayIcon },
] as NavigationItem[];

export const WorkspaceLayout = ({
  workspaceInfo: { user, workspace },
  secondAside,
  children,
}: WorkspaceLayoutProps) => {
  const { pathname } = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white">
      <Transition.Root show={sidebarOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-40 lg:hidden"
          onClose={setSidebarOpen}
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
                      onClick={() => setSidebarOpen(false)}
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
                <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
                  <Link
                    href="/find-workspace"
                    className="group block flex-shrink-0"
                  >
                    <div className="flex items-center">
                      <div>
                        {user.image ? (
                          <img
                            className="inline-block h-10 w-10 rounded-full"
                            src={user.image}
                            alt={user.name ?? "User"}
                          />
                        ) : (
                          <UserCircleIcon
                            className="h-10 w-10 rounded-full"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-base font-medium text-gray-700 group-hover:text-gray-900">
                          {user.name}
                        </p>
                        {/* <p className="text-sm font-medium text-gray-500 group-hover:text-gray-700">
                          View profile
                        </p> */}
                      </div>
                    </div>
                  </Link>
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 flex-shrink-0" aria-hidden="true">
              {/* Force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex w-64 flex-col">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-gray-100">
            <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
              <div className="flex flex-shrink-0 items-center px-4">
                <Link href="/" className="group block">
                  <Image
                    alt="logo"
                    className="h-8 w-auto"
                    src="/images/logo.png"
                    width={225}
                    height={225}
                  />
                </Link>
              </div>

              <nav className="mt-5 flex-1" aria-label="Sidebar">
                <div className="space-y-1 px-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={`/workspace/${workspace.id}${item.path}`}
                      className={classNames(
                        pathname.endsWith(item.path)
                          ? "bg-gray-200 text-gray-900"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        "group flex items-center rounded-md px-2 py-2 text-sm font-medium"
                      )}
                    >
                      <item.icon
                        className={classNames(
                          pathname.endsWith(item.path)
                            ? "text-gray-500"
                            : "text-gray-400 group-hover:text-gray-500",
                          "mr-3 h-6 w-6"
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
            <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
              <Link
                href="/find-workspace"
                className="group block w-full flex-shrink-0"
              >
                <div className="flex items-center">
                  <div>
                    {user.image ? (
                      <Image
                        className="inline-block h-9 w-9 rounded-full"
                        src={user.image}
                        alt={user.name ?? "User"}
                        width={36}
                        height={36}
                      />
                    ) : (
                      <UserCircleIcon
                        className="h-10 w-10 rounded-full"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {user.name}
                    </p>
                    {/* <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">View profile</p> */}
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="lg:hidden">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-1.5">
            <Link href="/" className="group block">
              <Image
                alt="logo"
                className="h-8 w-auto"
                src="/images/logo.png"
                width={225}
                height={225}
              />
            </Link>
            <div>
              <button
                type="button"
                //set maxwidth to 50% to prevent the button from growing too large
                className="-mr-3 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="sr-only">Open sidebar</span>
                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div className="relative z-0 flex max-h-screen flex-1 overflow-hidden">
          <main className="relative z-0 flex-1 overflow-y-auto focus:outline-none xl:order-last">
            {children}
          </main>
          {secondAside && (
            <aside className="relative order-first flex w-96 flex-shrink-0 flex-col overflow-y-auto border-r border-gray-200">
              {secondAside}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};
