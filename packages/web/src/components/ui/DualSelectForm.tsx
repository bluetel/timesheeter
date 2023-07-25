import { XMarkIcon } from "@heroicons/react/20/solid";
import { Select } from "./Select";
import { useEffect, useState } from "react";

type SelectOptions = {
  value: string
  label: string;
}[];

type DuelSelectEntry<FirstIsNullable extends boolean, SecondIsNullable extends boolean> = {
  firstSelectValue: FirstIsNullable extends true ? string | null : string;
  secondSelectValue: SecondIsNullable extends true ? string | null : string;
}

type DualSelectFormProps<FirstIsNullable extends boolean, SecondIsNullable extends boolean> = {
  firstSelectOptions: SelectOptions
  secondSelectOptions: SelectOptions
  values: DuelSelectEntry<FirstIsNullable, SecondIsNullable>[];
  onChange: (values: DuelSelectEntry<FirstIsNullable, SecondIsNullable>[]) => unknown;
  firstNullable: FirstIsNullable;
  secondNullable: SecondIsNullable;
  minRows?: number;
};

export const DualSelectForm = <FirstIsNullable extends boolean, SecondIsNullable extends boolean>({ firstSelectOptions, secondSelectOptions, values, onChange, firstNullable, secondNullable, minRows = 0 }: DualSelectFormProps<FirstIsNullable, SecondIsNullable>) => {
  const [localValues, setLocalValues] = useState(values);

  useEffect(() => {
    onChange(localValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValues]);

  if (!firstSelectOptions[0] && !firstNullable) {
    throw new Error("First select options must have at least one option if the select is not nullable");
  }

  if (!secondSelectOptions[0] && !secondNullable) {
    throw new Error("Second select options must have at least one option if the select is not nullable");
  }

  return (
    <div className="py-5 pl-6 pr-4">
      <div className="space-y-5 pb-5">
        {localValues.map((value, index) => (
          <div className="flex space-x-4 w-full" key={index}>
            <div className="w-1/2">
              <Select options={firstSelectOptions} active={value.firstSelectValue} nullable={firstNullable} onChange={
                (firstSelectValue) => setLocalValues(localValues.map((v, i) => (i === index ? { ...v, firstSelectValue } : v)))
              } />
            </div>
            <div className="flex space-x-2 w-full">
              <div className="w-full">
                <Select options={secondSelectOptions} active={value.secondSelectValue} nullable={secondNullable} onChange={
                  (secondSelectValue) => setLocalValues(localValues.map((v, i) => (i === index ? { ...v, secondSelectValue } : v)))
                } />
              </div>
              <button
                type="button"
                className="inline-flex flex-shrink-0 items-center justify-center text-gray-400 hover:text-gray-500"
                onClick={() => {
                  if (localValues.length <= minRows) {
                    return;
                  }

                  setLocalValues(localValues.filter((_, i) => i !== index))
                }}
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={() => {
          let firstSelectValue: string | null = null;

          if (!firstSelectOptions[0] && !firstNullable) {
            throw new Error("First select options must have at least one option if the select is not nullable");
          }

          if (firstSelectOptions[0] && !firstNullable) {
            firstSelectValue = firstSelectOptions[0].value;
          }

          let secondSelectValue: string | null = null;

          if (!secondSelectOptions[0] && !secondNullable) {
            throw new Error("Second select options must have at least one option if the select is not nullable");
          }

          if (secondSelectOptions[0] && !secondNullable) {
            secondSelectValue = secondSelectOptions[0].value;
          }

          setLocalValues([...localValues, { firstSelectValue: firstSelectValue as FirstIsNullable extends true ? string | null : string, secondSelectValue: secondSelectValue as SecondIsNullable extends true ? string | null : string }]);
        }}
      >
        Add another
      </button>
    </div >
  )
};
