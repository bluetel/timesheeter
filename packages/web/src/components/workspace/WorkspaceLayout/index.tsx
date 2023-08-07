import type { WorkspaceInfo } from "@timesheeter/web/server/lib/workspace-info";
import { useState } from "react";
import { MobileAppBar } from "./MobileAppBar";
import { DesktopSideBar } from "./DesktopSideBar";
import { MobileSideBar } from "./MobileSideBar";
import { DevTools } from "../../DevTools";

export type WorkspaceLayoutProps = {
  workspaceInfo: WorkspaceInfo;
  secondAside?: React.ReactNode;
  children: React.ReactNode;
};

export const WorkspaceLayout = ({
  workspaceInfo,
  secondAside,
  children,
}: WorkspaceLayoutProps) => {
  const [sideBarOpen, setSideBarOpen] = useState(false);

  return (<>
    <DevTools workspaceId={workspaceInfo.workspace.id} />
    <div className="flex h-screen bg-white">
      <MobileSideBar workspaceInfo={workspaceInfo} sideBarOpen={sideBarOpen} setSideBarOpen={setSideBarOpen} />

      {/* Static sidebar for desktop */}
      <DesktopSideBar workspaceInfo={workspaceInfo} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <MobileAppBar setSideBarOpen={setSideBarOpen} />
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
  </>);
};
