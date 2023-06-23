import { PlusIcon } from "@heroicons/react/20/solid";
import { createElement } from "react";
import { type IconType } from "react-icons";
import { classNames } from "@timesheeter/app/utils/tailwind";

export type SimpleEmptyStateProps = {
  title: string;
  helpText: string;
  icon: IconType;
  button?: {
    label: string;
    onClick: () => unknown;
  };
  shrink?: boolean;
};

export const SimpleEmptyState = ({
  title,
  helpText,
  icon,
  button,
  shrink,
}: SimpleEmptyStateProps) => (
  <div
    className={classNames(
      "flex items-center justify-center",
      shrink ? "" : "h-screen"
    )}
  >
    <div className="p-8 text-center">
      {createElement(icon, {
        className: "mx-auto h-12 w-12 text-gray-400",
        fill: "none",
        viewBox: "0 0 24 24",
        "aria-hidden": "true",
      })}
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      {button && (
        <div className="mt-6">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            onClick={button.onClick}
          >
            <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
            {button.label}
          </button>
        </div>
      )}
    </div>
  </div>
);
