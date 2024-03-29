import { Timepicker, Input, initTE } from "tw-elements";
import { useEffect } from "react";
import {
  datetimeToTimeString,
  timeStringToDatetime,
} from "@timesheeter/web/lib";
import { useZodForm } from "@timesheeter/web/utils/zod-form";
import { z } from "zod";

const timeSchema = z.object({
  time: z.string().nullable(),
});

type TimePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  formId: string;
};

export const _TimePicker = ({ value, onChange, formId }: TimePickerProps) => {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    initTE({ Timepicker, Input });
  }, []);

  const methods = useZodForm({
    schema: timeSchema,
    defaultValues: {
      time: datetimeToTimeString(value),
    },
  });

  // Listen for changes in the form and update the value
  useEffect(() => {
    const subscription = methods.watch((values) => {
      if (values.time === undefined) return;

      const timeDatetime = timeStringToDatetime(
        values.time,
        value ?? new Date()
      );

      if (timeDatetime === "invalid") return;

      onChange(timeDatetime);
    });
    return () => subscription.unsubscribe();
  }, [methods, onChange, value]);

  // On changes in value, update the form
  useEffect(() => {
    // Check if value is the same as the form value
    const timeString = datetimeToTimeString(value);

    if (methods.getValues("time") === timeString) return;

    methods.setValue("time", timeString, {
      shouldValidate: true,
    });
  }, [methods, value]);

  return (
    <form id={formId} noValidate className="w-full">
      <div
        className="relative w-full"
        data-te-timepicker-init
        data-te-format24="true"
      >
        <input
          type="button"
          id={`${formId}-input`}
          {...methods.register("time")}
          // @ts-expect-error - we know this is a valid value
          onInput={(e: { target: { value: string } }) =>
            methods.setValue("time", e.target.value, {
              shouldValidate: true,
            })
          }
          // hide input text
          className="peershadow-smoutline-none blockh-9min-h-[auto] border-0bg-transparent block h-9  w-full rounded-md border-0 p-1.5 leading-[1.6] text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition-all duration-200 ease-linear placeholder:text-gray-400 focus:ring-2  focus:ring-inset focus:ring-indigo-600 focus:placeholder:opacity-100 peer-focus:text-primary data-[te-input-state-active]:placeholder:opacity-100 motion-reduce:transition-none dark:text-neutral-200 dark:placeholder:text-neutral-200 dark:peer-focus:text-primary sm:text-sm sm:leading-6 [&:not([data-te-input-placeholder-active])]:placeholder:opacity-0"
        />
      </div>
    </form>
  );
};
