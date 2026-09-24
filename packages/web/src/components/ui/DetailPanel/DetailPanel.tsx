import { useState } from "react";
import { type IconType } from "react-icons";
import { Tabs } from "../Tabs";
import { DetailHeader, type DetailHeaderProps } from "./DetailHeader";

export type DetailPanelProps = {
  header: DetailHeaderProps;
  content: {
    name: string;
    description?: string;
    icon?: IconType;
    endButtons?: {
      onEdit?: () => void;
      onDelete?: () => void;
      custom?: React.ReactNode;
    };
  };
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
};

export const DetailPanel = ({ header, content, tabs }: DetailPanelProps) => {
  const [selectedTab, setSelectedTab] = useState<number>(0);

  return (
    <div className="space-y-8 p-8">
      <DetailHeader {...header} />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {content.icon && (
              <content.icon
                className="h-6 w-6 text-gray-400"
                aria-hidden="true"
              />
            )}
            <div>
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                {content.name}
              </h3>
              {content.description && (
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {content.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {content.endButtons?.custom && content.endButtons.custom}
            {content.endButtons?.onEdit && (
              <button
                type="button"
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                onClick={content.endButtons.onEdit}
              >
                Edit
              </button>
            )}
            {content.endButtons?.onDelete && (
              <button
                type="button"
                className="ml-3 inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                onClick={content.endButtons.onDelete}
              >
                Delete
              </button>
            )}
          </div>
        </div>
        {tabs.multiple && (
          <Tabs
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
            tabs={tabs.bodies.map((tab) => ({
              label: tab.label,
              icon: tab.icon,
            }))}
          />
        )}
        {((tabs.multiple && tabs.bodies[selectedTab]?.subDescription) ||
          (!tabs.multiple && tabs.subDescription)) && (
          <p className="text-sm text-gray-500">
            {tabs.multiple
              ? tabs.bodies[selectedTab]?.subDescription
              : tabs.subDescription}
          </p>
        )}
        <div className="border-t border-gray-200">
          {tabs.multiple ? (
            tabs.bodies.map((tab, tabIdx) => (
              <div
                key={tab.label}
                className={tabIdx === selectedTab ? undefined : "hidden"}
              >
                {tab.body}
              </div>
            ))
          ) : (
            <div>{tabs.body}</div>
          )}
        </div>
      </div>
    </div>
  );
};
