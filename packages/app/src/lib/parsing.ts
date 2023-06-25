export const dateStringToDatetime = (
  dateString: string | null,
  referenceTime: Date
): Date | null | "invalid" => {
  if (!dateString) {
    return null;
  }

  const [day, month, year] = dateString.split("/").map((num) => parseInt(num));

  if (!day || !month || !year) {
    return "invalid";
  }

  const datetime = new Date(year, month - 1, day);

  // Add the reference time
  datetime.setHours(referenceTime.getHours());
  datetime.setMinutes(referenceTime.getMinutes());

  if (datetime.toString() === "Invalid Date") {
    return "invalid";
  }

  return datetime;
};

export const datetimeToDateString = (date: Date | null): string => {
  if (!date) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${day}/${month}/${year}`;
};

export const timeStringToDatetime = (
  timeString: string | null | undefined,
  referenceDate: Date
): Date | null | "invalid" => {
  if (!timeString) {
    return null;
  }

  const [hours, minutes] = timeString.split(":").map((num) => parseInt(num));

  if (!hours || !minutes) {
    return "invalid";
  }

  const datetime = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    hours,
    minutes
  );

  if (datetime.toString() === "Invalid Date") {
    return "invalid";
  }

  return datetime;
};

export const datetimeToTimeString = (date: Date | null): string => {
  if (!date) {
    return "";
  }

  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${hours}:${minutes}`;
};
