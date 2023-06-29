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

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

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
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customJSONStringify = (obj: any): string => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "bigint") {
      return value.toString() + "n";
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customJSONParse = (json: string): any => {
  return JSON.parse(json, (key, value) => {
    if (typeof value === "string" && /^-?\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return value;
  });
};
