export const chronRegex =
  /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;

export const hostnameRegex =
  /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/;

export const taskPrefixRegex = /^[A-Z]{1,8}$/;

export const taskRegex = /^([A-Za-z]{1,8})\s*-\s*([0-9]+)(?:\s*[-:]?\s*(.+))?$/;

export const monthYearRegex =
  /^(?:january|february|march|april|may|june|july|august|september|october|november|december)\s\d{2,4}$/i;

export const ukDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const isoStringRegex = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/;

// DD/MM/YYYY
export const togglDateFormatRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
