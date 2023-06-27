import { ukDateRegex } from "@timesheeter/app";
import axios from "axios";
import { z } from "zod";

const MONTHS = [
    ["january", "jan"],
    ["february", "feb"],
    ["march", "mar"],
    ["april", "apr"],
    ["may"],
    ["june", "jun"],
    ["july", "jul"],
    ["august", "aug"],
    ["september", "sep"],
    ["october", "oct"],
    ["november", "nov"],
    ["december", "dec"],
] as const;

export const getMonthIndex = (month: string) => {
    const monthLowerCase = month.toLowerCase();

    const monthIndex = MONTHS.findIndex((months) => (months as unknown as string[]).includes(monthLowerCase));

    if (monthIndex === -1) {
        throw new Error(`Invalid month: ${month}`);
    }

    return monthIndex;
};

export const monthYearToDate = (monthYear: string) => {
    const [month, year] = monthYear.toLowerCase().split(" ");
    if (!month || !year) {
        throw new Error("Invalid month/year");
    }

    const monthIndex = getMonthIndex(month);

    // Convert to a date
    const date = new Date(parseInt(year), monthIndex, 1);

    // Check if valid date
    if (isNaN(date.getTime())) {
        throw new Error("Invalid month/year");
    }

    return date;
};

export const dateToMonthYear = (date: Date) => {
    const monthLowerCase = MONTHS[date.getUTCMonth()][0];
    const month = `${monthLowerCase[0].toUpperCase()}${monthLowerCase.slice(1)}`;

    const year = date.getUTCFullYear();

    return `${month} ${year}`;
};

const bankHolidayResponseSchema = z.object({
    "england-and-wales": z.object({
        events: z
            .object({
                date: z.string().regex(ukDateRegex),
            })
            .array(),
    }),
});

const BANK_HOLIDAYS_ENDPOINT = "https://www.gov.uk/bank-holidays.json" as const;

export const getBankHolidayDates = async () => {
    const response = await axios.request({
        url: BANK_HOLIDAYS_ENDPOINT,
    });

    const data = bankHolidayResponseSchema.parse(response.data);

    return data["england-and-wales"].events.map(({ date: dateString }) => {
        const [day, month, year] = dateString.split("-");

        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    });
};
