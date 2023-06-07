import { BasicFormItem, type BasicFormItemProps } from "./BasicFormItem";

type BasicFormProps = {
  items: BasicFormItemProps[];
};

export const BasicForm = ({ items }: BasicFormProps) => {
  return (
    <div className="space-y-6 py-6 sm:space-y-0 sm:divide-y sm:divide-gray-200 sm:py-0">
      {items.map((item, index) => (
        <BasicFormItem key={index} {...item} />
      ))}
    </div>
  );
};
