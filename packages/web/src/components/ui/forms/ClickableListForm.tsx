import { type SimpleEmptyStateProps } from "../SimpleEmptyState";

export type ClickableListFormItem = {
  id: string;
  label: string;
  subLabel?: string;
  icon?: React.ElementType;
  onChange: (selected: boolean) => void;
  selected: boolean;
};

type ClickableListFormProps = {
  items: ClickableListFormItem[];
  emptyState: SimpleEmptyStateProps;
};

export const ClickableListForm = ({ items }: ClickableListFormProps) => (
  <fieldset className="divide-y divide-gray-200">
    {items.map((item) => (
      <div
        className=" flex h-20 justify-between px-4 pb-4 pt-3.5"
        key={item.id}
      >
        <div className="flex items-center justify-start space-x-3">
          {item.icon && (
            <item.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1 text-sm leading-6">
            <label className="font-medium text-gray-900">{item.label}</label>
            {item.subLabel && <p className="text-gray-500">{item.subLabel}</p>}
          </div>
        </div>
        <div className="ml-3 flex h-6 items-center">
          <input
            type="checkbox"
            onChange={() => item.onChange?.(!item.selected)}
            checked={item.selected}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
          />
        </div>
      </div>
    ))}
  </fieldset>
);
