import { XMarkIcon } from "@heroicons/react/20/solid";

type ListableFormProps = {
  values: string[];
  onChange: (values: string[]) => unknown;
};

export const ListableForm = ({ values, onChange }: ListableFormProps) => (
  <div className="py-5 pl-6 pr-4">
    <div className="space-y-5 pb-5">
      {values.map((value, index) => (
        <div key={index} className="flex space-x-2">
          <input
            className="mr-2 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            placeholder="E.g. Standup"
            value={value}
            onChange={(e) =>
              onChange(values.map((v, i) => (i === index ? e.target.value : v)))
            }
          />
          <button
            type="button"
            className="inline-flex flex-shrink-0 items-center justify-center text-gray-400 hover:text-gray-500"
            onClick={() => onChange(values.filter((_, i) => i !== index))}
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
    <button
      type="button"
      className="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      onClick={() => onChange([...values, ""])}
    >
      Add another
    </button>
  </div>
);
