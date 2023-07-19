import { XMarkIcon } from "@heroicons/react/20/solid";
import { Select } from "./Select";
import { useEffect, useState } from "react";

type SelectAndTextEntry<IsNullableType extends boolean> = {
  selectValue: IsNullableType extends true ? string | null : string;
  text: string;
}

type SelectAndTextFormProps<IsNullableType extends boolean> = {
  selectOptions: {
    value: string
    label: string;
  }[];
  values: SelectAndTextEntry<IsNullableType>[];
  onChange: (values: SelectAndTextEntry<IsNullableType>[]) => unknown;
  nullable: IsNullableType;
  placeholder: string;
  minRows?: number;
};

export const SelectAndTextForm = <IsNullableType extends boolean>({ selectOptions, values, onChange, nullable, placeholder, minRows = 0 }: SelectAndTextFormProps<IsNullableType>) => {
  const [localValues, setLocalValues] = useState(values);

  useEffect(() => {
    onChange(localValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValues]);

  if (!selectOptions[0] && !nullable) {
    throw new Error("Select options must have at least one option if the select is not nullable");
  }

  return (
    <div className="py-5 pl-6 pr-4">
      <div className="space-y-5 pb-5">
        {localValues.map((value, index) => (
          <div className="flex space-x-4 w-full" key={index}>
            <div className="w-1/2">
              <Select options={selectOptions} active={value.selectValue} nullable={nullable} onChange={
                (selectValue) => setLocalValues(localValues.map((v, i) => (i === index ? { ...v, selectValue } : v)))
              } />
            </div>
            <div className="flex space-x-2 w-full">
              <input
                className="mr-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder={placeholder}
                value={value.text}
                onChange={(e) => setLocalValues(localValues.map((v, i) => (i === index ? { ...v, text: e.target.value } : v)))
                }
              />
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
          let selectValue: string | null = null;

          if (!selectOptions[0] && !nullable) {
            throw new Error("Select options must have at least one option if the select is not nullable");
          }

          if (selectOptions[0] && !nullable) {
            selectValue = selectOptions[0].value;
          }

          setLocalValues([...localValues, { selectValue: selectValue as IsNullableType extends true ? string | null : string, text: "" }]);
        }}
      >
        Add another
      </button>
    </div >
  )
};
