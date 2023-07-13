import { type FieldError, type UseFormRegisterReturn } from "react-hook-form";
import { Select, type SelectProps } from "../../Select";
import { Toggle } from "../../Toggle";
import { DatePicker, DateTimePicker, TimePicker } from "../../tw-elements";

type FieldOptions<RequiredType extends boolean> =
  | {
      variant: "textarea" | "text" | "number";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      register: UseFormRegisterReturn<any>;
    }
  | {
      variant: "select";

      select: Omit<SelectProps<RequiredType>, "nullable">;
    }
  | {
      variant: "checkbox";
      checked: boolean;
      onChange: (checked: boolean) => unknown;
    }
  | {
      variant: "datetime" | "date" | "time";
      value: Date | null;
      onChange: (date: Date | null) => void;
      formId: string;
    };

export type BasicFormItemProps<RequiredType extends boolean = boolean> = {
  required: RequiredType;
  label: {
    title: string;
    description?: string;
  };
  field: FieldOptions<RequiredType> & {
    error?: FieldError;
  };
};

export const BasicFormItem = <RequiredType extends boolean>({
  required,
  label,
  field,
}: BasicFormItemProps<RequiredType>) => {
  return (
    <div className="space-y-2 px-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:space-y-0 sm:px-6 sm:py-5">
      <div>
        <label className="block text-sm font-medium leading-6 text-gray-900 ">
          {label.title}
          {required && <span className="text-gray-400">*</span>}
          {label.description && (
            <p className=" text-sm text-gray-500">{label.description}</p>
          )}
        </label>
      </div>
      <div className="sm:col-span-2">
        {field.variant === "textarea" && (
          <textarea
            {...field.register}
            rows={3}
            className="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        )}
        {(field.variant === "text" || field.variant === "number") && (
          <input
            type="text"
            {...field.register}
            className="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        )}
        {field.variant === "select" && (
          <Select {...field.select} nullable={!required as RequiredType} />
        )}
        {field.variant === "checkbox" && (
          <Toggle checked={field.checked} onChange={field.onChange} />
        )}
        {field.variant === "date" && <DatePicker {...field} />}
        {field.variant === "time" && <TimePicker {...field} />}
        {field.variant === "datetime" && <DateTimePicker {...field} />}
        {field.error && (
          <p className="mt-2 text-sm text-red-600">
            {field.error.message ?? "Unknown error"}
          </p>
        )}
      </div>
    </div>
  );
};
