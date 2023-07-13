import { Fragment, useMemo } from "react";
import { Transition, Listbox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/20/solid";
import { classNames } from "@timesheeter/web/utils/tailwind";

export type SelectProps<IsNullableType extends boolean> = {
  options: {
    value: string;
    label: string;
  }[];
  active: IsNullableType extends true ? string : string | null;
  onChange: (
    value: IsNullableType extends true ? string : string | null
  ) => unknown;
  nullable: IsNullableType;
};

export const Select = <IsNullableType extends boolean>({
  options,
  active,
  onChange,
  nullable,
}: SelectProps<IsNullableType>) => {
  const activeLabel = useMemo(() => {
    const foundLabel = options.find(({ value }) => value === active)?.label;

    if (!nullable && !foundLabel) {
      throw new Error("Could not find active label and nullable is false");
    }

    return foundLabel ?? "None";
  }, [options, active, nullable]);

  const includeNullOptions = useMemo(() => {
    if (nullable) {
      return [
        {
          value: null,
          label: "None",
        },
        ...options,
      ];
    }

    return options;
  }, [options, nullable]);

  return (
    <Listbox value={active} onChange={onChange}>
      {({ open }) => (
        <div className="relative">
          <Listbox.Button className="h-9 w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
            <span className="block truncate">{activeLabel}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            show={open}
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-10 mt-1  max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {includeNullOptions.map((option) => (
                <Listbox.Option
                  key={option.value}
                  className={({ active }) =>
                    classNames(
                      active ? "bg-indigo-600 text-white" : "text-gray-900",
                      "relative cursor-default select-none py-2 pl-3 pr-9"
                    )
                  }
                  value={option.value}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={classNames(
                          selected ? "font-semibold" : "font-normal",
                          "block truncate"
                        )}
                      >
                        {option.label}
                      </span>
                      {selected ? (
                        <span
                          className={classNames(
                            active ? "text-white" : "text-indigo-600",
                            "absolute inset-y-0 right-0 flex items-center pr-4"
                          )}
                        >
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
  );
};
