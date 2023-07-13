import { type IconType } from "react-icons";
import { classNames } from "@timesheeter/web/utils/tailwind";

type TabsProps = {
  tabs: {
    label: string;
    icon?: IconType;
  }[];
  selectedTab: number;
  setSelectedTab: (value: number) => void;
};

export const Tabs = ({ tabs, selectedTab, setSelectedTab }: TabsProps) => (
  <div className="block overflow-x-auto">
    <nav className="flex space-x-4" aria-label="Tabs">
      {tabs.map((tab, tabIdx) => (
        <span
          key={tabIdx}
          onClick={() => setSelectedTab(tabIdx)}
          className={classNames(
            selectedTab === tabIdx
              ? "bg-indigo-100 text-indigo-700"
              : "text-gray-500 hover:text-gray-700",
            "inline-flex cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm font-medium"
          )}
          aria-current={tabIdx === selectedTab ? "page" : undefined}
        >
          {tab.icon && (
            <tab.icon
              className={classNames(
                selectedTab === tabIdx
                  ? "text-indigo-500"
                  : "text-gray-400 group-hover:text-gray-500",
                "-ml-0.5 mr-2 h-5 w-5"
              )}
              aria-hidden="true"
            />
          )}
          <span>{tab.label}</span>
        </span>
      ))}
    </nav>
  </div>
);
