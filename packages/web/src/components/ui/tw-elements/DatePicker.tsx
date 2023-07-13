import { Datepicker, Input, initTE } from "tw-elements";
import { useEffect } from "react";

import { z } from "zod";
import { useZodForm } from "@timesheeter/web/utils/zod-form";
import {
  dateStringToDatetime,
  datetimeToDateString,
} from "@timesheeter/web/lib";

const dateSchema = z.object({
  date: z.string().nullable(),
});

type DatePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  formId: string;
};

export const _DatePicker = ({ value, onChange, formId }: DatePickerProps) => {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    initTE({ Datepicker, Input });
  }, []);

  const methods = useZodForm({
    schema: dateSchema,
    defaultValues: {
      date: datetimeToDateString(value),
    },
  });

  // Listen for changes in the form and update the value
  useEffect(() => {
    const subscription = methods.watch((values) => {
      if (values.date === undefined) return;

      const datetime = dateStringToDatetime(values.date, value ?? new Date());

      if (datetime === "invalid") return;

      onChange(datetime);
    });
    return () => subscription.unsubscribe();
  }, [methods, onChange, value]);

  // On changes in value, update the form
  useEffect(() => {
    // Check if value is the same as the form value

    const dateString = datetimeToDateString(value);

    if (methods.getValues("date") === dateString) return;

    methods.setValue("date", dateString, {
      shouldValidate: true,
    });
  }, [methods, value]);

  return (
    <form id={formId} className="w-full" noValidate>
      <div className="relative w-full" data-te-datepicker-init>
        <input
          type="button"
          {...methods.register("date")}
          // @ts-expect-error - we know this is a valid value
          onInput={(e: { target: { value: string } }) =>
            methods.setValue("date", e.target.value, {
              shouldValidate: true,
            })
          }
          className="sm:leading-6block sm:leading-6peer shadow-smoutline-none block h-9 min-h-[auto] w-full rounded-md border-0 bg-transparent p-1.5 leading-[1.6] text-gray-900 ring-1 ring-inset ring-gray-300 transition-all duration-200 ease-linear placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 focus:placeholder:opacity-100 peer-focus:text-primary data-[te-input-state-active]:placeholder:opacity-100 motion-reduce:transition-none dark:text-neutral-200 dark:placeholder:text-neutral-200 dark:peer-focus:text-primary sm:text-sm [&:not([data-te-input-placeholder-active])]:placeholder:opacity-0"
        />
      </div>
    </form>
  );
};
