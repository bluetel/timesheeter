export const dateStringToDatetime = (dateString: string): Date | null => {
  const [day, month, year] = dateString.split("/").map((num) => parseInt(num));

  if (!day || !month || !year) {
    return null;
  }

  return new Date(year, month - 1, day);
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
  timeString: string,
  referenceDate: Date
): Date | null => {
  const [hours, minutes] = timeString.split(":").map((num) => parseInt(num));

  if (!hours || !minutes) {
    return null;
  }

  return new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    hours,
    minutes
  );
};

export const datetimeToTimeString = (date: Date | null): string => {
  if (!date) {
    return "";
  }

  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${hours}:${minutes}`;
};
