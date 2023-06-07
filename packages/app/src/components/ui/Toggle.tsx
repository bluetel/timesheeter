import { Switch } from "@headlessui/react";
import { classNames } from "@timesheeter/app/utils/tailwind";

type ToggleProps = {
  label?: {
    primary?: string;
    secondary?: string;
  };
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const Toggle = ({ label, checked, onChange }: ToggleProps) => (
  <Switch.Group as="div" className="flex items-center">
    <Switch
      checked={checked}
      onChange={onChange}
      className={classNames(
        checked ? "bg-indigo-600" : "bg-gray-200",
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
      )}
    >
      <span
        aria-hidden="true"
        className={classNames(
          checked ? "translate-x-5" : "translate-x-0",
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
        )}
      />
    </Switch>
    <Switch.Label as="span" className="ml-3 text-sm">
      {label?.primary && (
        <span className="font-medium text-gray-900">{label.primary}</span>
      )}
      {label?.secondary && (
        <span className="text-gray-500">{label.secondary}</span>
      )}
    </Switch.Label>
  </Switch.Group>
);
