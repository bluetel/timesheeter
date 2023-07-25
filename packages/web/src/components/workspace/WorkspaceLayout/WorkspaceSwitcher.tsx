import { Menu, Transition } from "@headlessui/react"
import { ChevronUpDownIcon } from "@heroicons/react/20/solid"
import { WorkspaceIcon } from "@timesheeter/web/lib"
import { api } from "@timesheeter/web/utils/api"
import { classNames } from "@timesheeter/web/utils/tailwind"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { Fragment, useEffect, useState } from "react"
import { EditWorkspaceSideOver } from "../management/EditWorkspaceSideOver"

type WorkspaceSwitcherProps = {
  activeWorkspace: {
    id: string
    name: string
  }
}

export const WorkspaceSwitcher = ({ activeWorkspace }: WorkspaceSwitcherProps) => {
  const { data: myWorkpaces = [], refetch: refetchMyWorkspaces } = api.workspace.management.myWorkspaces.useQuery();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    refetchMyWorkspaces()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  return (<>
    <EditWorkspaceSideOver
      refetchWorkspaces={refetchMyWorkspaces}
      show={showCreateWorkspace}
      onClose={() => setShowCreateWorkspace(false)}
      data={{ new: true }}
    />
    <Menu as="div" className="relative inline-block px-3 text-left pt-5 w-full">
      <div>
        <Menu.Button className="group w-full rounded-md bg-gray-100 px-3.5 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-100">
          <span className="flex w-full items-center justify-between">
            <span className="flex min-w-0 items-center justify-between space-x-3">
              <WorkspaceIcon
                className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-300"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-gray-900">
                  {activeWorkspace.name}
                </span>
                <span className="truncate text-sm text-gray-500">Current Workspace</span>
              </span>
            </span>
            <ChevronUpDownIcon
              className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-500"
              aria-hidden="true"
            />
          </span>
        </Menu.Button>
      </div>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 right-0 z-10 mx-3 mt-1 origin-top divide-y divide-gray-200 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {myWorkpaces.length > 0 && (
            <div className="py-1">
              <div className="px-4 py-2 text-sm text-gray-500">
                <span>Switch to</span>
              </div>
              {
                myWorkpaces.map((workspace) => {
                  const disabled = workspace.id === activeWorkspace.id;

                  return (
                    <Menu.Item key={workspace.id} disabled={disabled}>
                      {({ active }) => (
                        <Link
                          href={`/workspace/${workspace.id}`}
                          className={classNames(
                            active ? `bg-gray-100 ${!disabled ? "text-gray-900" : ""}` : `${!disabled ? "text-gray-700" : ""}`,
                            "block px-4 py-2 text-sm", disabled ? "text-gray-300 cursor-default" : undefined
                          )}
                        >
                          {workspace.name}
                        </Link>
                      )}
                    </Menu.Item>)
                })
              }
            </div>)}

          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => setShowCreateWorkspace(true)}
                  className={classNames(
                    active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                    "block px-4 py-2 text-sm w-full text-left"
                  )}
                >
                  Create a new workspace
                </button>
              )}
            </Menu.Item>
          </div>

          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  className={classNames(
                    active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                    "block px-4 py-2 text-sm w-full text-left"
                  )}
                  // eslint-disable-next-line @typescript-eslint/no-misused-promises
                  onClick={() => signOut({
                    callbackUrl: "/",
                  })}
                >
                  Logout
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  </>
  )
}