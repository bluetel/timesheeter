import { type IconType } from "react-icons";

export type SelectableListProps = {
  items: {
    label: string;
    subLabel?: string;
    icon?: IconType;
    onClick?: () => unknown;
    selected?: boolean;
    actionButtons?: {
      label: string;
      onClick: () => unknown;
      variant?: "normal" | "danger";
    }[];
  }[];
};

export const SelectableList = ({ items }: SelectableListProps) => (
  <ul role="list" className="relative z-0 divide-y divide-gray-200">
    {items.map((item, index) => (
      <li key={index} className="bg-white" onClick={item.onClick}>
        <div
          className={`relative flex h-20 items-center space-x-3 px-6 py-5 ${
            item.selected ? "ring-2 ring-inset ring-indigo-500" : ""
          } cursor-pointer hover:bg-gray-50`}
        >
          <div className="flex-shrink-0">
            {item.icon && (
              <item.icon
                className="mr-1 h-6 w-6 text-gray-400"
                aria-hidden="true"
                viewBox="0 0 24 24"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-6">
              <div>
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">
                  {item.label}
                </p>
                <p className="truncate text-sm text-gray-500">
                  {item.subLabel}
                </p>
              </div>
            </div>
          </div>
          {item.actionButtons && (
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-3">
                {item.actionButtons.map((button, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${
                      button.variant === "danger"
                        ? "text-red-600 hover:text-red-500"
                        : ""
                    } z-10`}
                    onClick={(event) => {
                      event.stopPropagation();
                      button.onClick();
                    }}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </li>
    ))}
  </ul>
);
