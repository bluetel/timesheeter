import type { WorkspaceInfo } from "@timesheeter/web/server/lib/workspace-info";
import { useRouter } from "next/router";
import Link from "next/link";
import { classNames } from "@timesheeter/web/utils/tailwind";
import Image from "next/image";
import { navigation } from "./navigation";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";


type DesktopSideBarProps = {
  workspaceInfo: WorkspaceInfo;
}

export const DesktopSideBar = ({
  workspaceInfo: { workspace },
}: DesktopSideBarProps) => {
  const { pathname } = useRouter();

  return (
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

            <WorkspaceSwitcher activeWorkspace={{
              id: workspace.id,
              name: workspace.name,
            }} />

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
              {/* <div className="mt-8 px-2">
                <h3 className="px-3 text-sm font-medium text-gray-500" id="desktop-teams-headline">
                  Admin
                </h3>
                <div className="mt-1 space-y-1" role="group" aria-labelledby="desktop-teams-headline">
                   {teams.map((team) => (
                    <a
                      key={team.name}
                      href={team.href}
                      className="group flex items-center rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    >
                      <span
                        className={classNames(
                          team.bgColorClass,
                          "mr-4 h-2.5 w-2.5 rounded-full"
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{team.name}</span>
                    </a>
                  ))}
                </div>
              </div> */}
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
}