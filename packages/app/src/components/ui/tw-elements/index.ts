import dynamic from "next/dynamic";

export const DatePicker = dynamic(
  () => import("./DatePicker").then((mod) => mod._DatePicker),
  {
    ssr: false,
  }
);

export const TimePicker = dynamic(
  () => import("./TimePicker").then((mod) => mod._TimePicker),
  {
    ssr: false,
  }
);

export const DateTimePicker = dynamic(
  () => import("./DateTimePicker").then((mod) => mod._DateTimePicker),
  {
    ssr: false,
  }
);
