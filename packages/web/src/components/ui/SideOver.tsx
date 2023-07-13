import { type IconType } from "react-icons";
import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Tabs } from "./Tabs";

type SideOverProps = {
  title: string;
  description: string;
  actionButtonLabel: "Create" | "Update";
  tabs:
  | {
    multiple: false;
    body: React.ReactNode;
    subDescription?: string;
  }
  | {
    multiple: true;
    bodies: {
      label: string;
      icon?: IconType;
      body: React.ReactNode;
      subDescription?: string;
    }[];
  };
  show: boolean;
  onClose: () => void;
  onFormSubmit: (e: React.FormEvent<HTMLFormElement>) => unknown;
};

export const SideOver = ({
  title,
  description,
  actionButtonLabel,
  tabs,
  show,
  onClose,
  onFormSubmit,
}: SideOverProps) => {
  const [selectedTab, setSelectedTab] = useState(0);

  // If set to show, we want to reset the selected tab
  useEffect(() => {
    if (show) {
      setSelectedTab(0);
    }
  }, [show]);

  return (
    <Transition.Root show={show} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <div className="fixed inset-0" />
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                  <form onSubmit={onFormSubmit} noValidate className="h-full">
                    <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="bg-gray-50 px-4 py-6 sm:px-6">
                          <div className="flex items-start justify-between space-x-3">
                            <div className="space-y-1">
                              <Dialog.Title className="text-base font-semibold leading-6 text-gray-900">
                                {title}
                              </Dialog.Title>
                              <p className="text-sm text-gray-500">
                                {description}
                              </p>
                            </div>
                            <div className="flex h-7 items-center">
                              <button
                                type="button"
                                className="text-gray-400 hover:text-gray-500"
                                onClick={onClose}
                              >
                                <span className="sr-only">Close panel</span>
                                <XMarkIcon
                                  className="h-6 w-6"
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                        {tabs.multiple && (
                          <div className="border-b border-gray-200 p-4 sm:px-6">
                            <Tabs
                              tabs={tabs.bodies.map((tab) => ({
                                label: tab.label,
                                icon: tab.icon,
                              }))}
                              selectedTab={selectedTab}
                              setSelectedTab={setSelectedTab}
                            />
                          </div>
                        )}  {/* Sub description */}
                        {((tabs.multiple && tabs.bodies[selectedTab]?.subDescription) || (!tabs.multiple && tabs.subDescription)) && (
                          <div className="px-4 py-4 sm:px-6 border-b border-gray-200">
                            <p className="text-sm text-gray-500">
                              {tabs.multiple
                                ? tabs.bodies[selectedTab]?.subDescription
                                : tabs.subDescription}
                            </p>
                          </div>
                        )}
                        {tabs.multiple
                          ? tabs.bodies.map((tab, index) => (
                            <div
                              key={index}
                              className={`${index === selectedTab ? "block" : "hidden"
                                }`}
                            >
                              {tab.body}
                            </div>
                          ))
                          : tabs.body}
                      </div>
                      {/* Action buttons */}
                      <div className="flex-shrink-0 border-t border-gray-200 px-4 py-5 sm:px-6">
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            className="rounded-md bg-white py-2 px-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                            onClick={onClose}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="inline-flex justify-center rounded-md bg-indigo-600 py-2 px-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                          >
                            {actionButtonLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
