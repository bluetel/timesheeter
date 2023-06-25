import { _DatePicker } from "./DatePicker";
import { _TimePicker } from "./TimePicker";

type DateTimePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  formId: string;
};

export const _DateTimePicker = ({
  value,
  onChange,
  formId,
}: DateTimePickerProps) => {
  return (
    <div className="flex space-x-2">
      <_DatePicker
        value={value}
        onChange={onChange}
        formId={`${formId}-date`}
      />
      <_TimePicker
        value={value}
        onChange={onChange}
        formId={`${formId}-time`}
      />
    </div>
  );
};
