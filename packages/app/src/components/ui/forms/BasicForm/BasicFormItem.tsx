import { type FieldError, type UseFormRegisterReturn } from "react-hook-form";
import { Select, type SelectProps } from "../../Select";
import { useMemo } from "react";
import { Toggle } from "../../Toggle";

export type BasicFormItemProps = {
  required?: boolean;
  label: {
    title: string;
    description?: string;
  };
  field:
  | {
    variant: "textarea" | "text";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    register: UseFormRegisterReturn<any>;
    error?: FieldError;
  }
  | {
    variant: "select";
    error?: FieldError;
    options: SelectProps["options"];
    active: string;
    onChange: SelectProps["onChange"];
  }
  | {
    variant: "checkbox";
    checked: boolean;
    onChange: (checked: boolean) => unknown;
    error?: FieldError;
  }
};

export const BasicFormItem = ({
  required,
  label,
  field,
}: BasicFormItemProps) => {
  const activeLabel = useMemo(() => {
    if (field.variant !== "select") return "";

    const activeOption = field.options.find(
      (option) => option.value === field.active
    );

    return activeOption?.label ?? "Unknown";
  }, [field]);

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
        {field.variant === "text" && (
          <input
            type="text"
            {...field.register}
            className="block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        )}
        {field.variant === "select" && (
          <Select
            {...field}
            active={{
              value: field.active,
              label: activeLabel,
            }}
          />
        )}
        {field.variant === "checkbox" && (
          <Toggle checked={field.checked} onChange={field.onChange} />
        )}
        {field.error && (
          <p className="mt-2 text-sm text-red-600">
            {field.error.message ?? "Unknown error"}
          </p>
        )}
      </div>
    </div>
  );
};
