import { type IconType } from "react-icons";
import { classNames } from "@timesheeter/app/utils/tailwind";
import {
  DetailHeader,
  type DetailHeaderProps,
} from "./DetailPanel/DetailHeader";

type StartingPointsEmptyStateProps = {
  header: Omit<DetailHeaderProps, "newButton">;
  items: {
    background: string;
    icon: IconType;
    title: string;
    description: string;
    onClick: () => unknown;
    countDetail?: {
      label: string;
      count: number;
    };
  }[];
  bottomButton?: {
    label: string;
    onClick: () => unknown;
  };
};

export const StartingPointsEmptyState = ({
  header,
  items,
  bottomButton,
}: StartingPointsEmptyStateProps) => {
  return (
    <div>
      <DetailHeader {...header} />
      {items && (
        <ul
          role="list"
          className="mt-6 grid grid-cols-1 gap-6 border-t border-gray-200 py-6 sm:grid-cols-2"
        >
          {items.map((item, itemIdx) => (
            <li key={itemIdx} className="flow-root">
              <div className="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 hover:bg-gray-50">
                <div
                  className={classNames(
                    item.background,
                    "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg"
                  )}
                >
                  <item.icon
                    className="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    <button
                      className="flex focus:outline-none"
                      onClick={item.onClick}
                    >
                      <span className="absolute inset-0" aria-hidden="true" />
                      <span>{item.title}</span>
                      <span aria-hidden="true" className="ml-2">
                        &rarr;
                      </span>
                    </button>
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {item.description}
                  </p>
                  {/* Add nubmer of items here, showing the count in a circle then label to right */}
                  {item.countDetail && (
                    <div className="mt-2 flex items-center space-x-2 text-sm text-gray-500">
                      <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium text-gray-900 ring-1 ring-inset ring-gray-200">
                        {item.countDetail.count}
                      </span>
                      <span className="text-gray-500">
                        {item.countDetail.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {bottomButton && (
        <>
          <div className="border-t border-gray-200" />
          <div className="mt-4 flex">
            <button
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              onClick={bottomButton.onClick}
            >
              {bottomButton.label}
              <span aria-hidden="true"> &rarr;</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
