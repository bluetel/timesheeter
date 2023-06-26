import { ParsedIntegration, monthYearRegex } from "@timesheeter/app";
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from "google-spreadsheet";
import { SheetToProcess, getSheetBasedStartDate } from "./sheets";
import { getDatabaseEntries, getDatabaseEntriesStartDate } from "./database-entries";

type GoogleSheetsIntegration = ParsedIntegration & {
    config: {
        type: "GoogleSheetsIntegration";
    };
};

export const handleGoogleSheetsIntegration = async ({
    integration: {
        config: { skipTillAfterMonth, commitDelayDays, sheetId, serviceAccountEmail, privateKey },
    },
}: {
    integration: GoogleSheetsIntegration;
}) => {
    const doc = new GoogleSpreadsheet(sheetId);

    await doc.useServiceAccountAuth({
        client_email: serviceAccountEmail,
        private_key: privateKey,
    });

    await doc.loadInfo();

    const skipTillAfterMonthDate = skipTillAfterMonth ? monthYearToDate(skipTillAfterMonth) : null;

    const sheetsToProcess = await filterExistingSheets(doc.sheetsByIndex, skipTillAfterMonthDate);

    // Last day to file is commitDelayDays ago
    const lastDayToFile = new Date();
    lastDayToFile.setDate(lastDayToFile.getDate() - commitDelayDays);

    // Get the first day of the month after the month of skipTillAfterMonth ie one month later
    let firstDayToProcess = new Date();

    if (skipTillAfterMonthDate) {
        firstDayToProcess.setDate(skipTillAfterMonthDate.getDate());
        firstDayToProcess.setMonth(skipTillAfterMonthDate.getMonth() + 1);
    }

    const sheetBasedStartDate = getSheetBasedStartDate(sheetsToProcess);

    if (sheetBasedStartDate && sheetBasedStartDate > firstDayToProcess) {
        firstDayToProcess = sheetBasedStartDate;
    }

    const databaseEntries = await getDatabaseEntries({
        fromStartDate: firstDayToProcess,
        toStartDate: lastDayToFile,
    });

    // If both are empty, return null
    if (databaseEntries.holidays.length === 0 && databaseEntries.timesheetEntries.length === 0) {
        return null;
    }

    const databaseEntriesBasedStartDate = getDatabaseEntriesStartDate(databaseEntries);

    if (databaseEntriesBasedStartDate && databaseEntriesBasedStartDate > firstDayToProcess) {
        firstDayToProcess = databaseEntriesBasedStartDate;
    }
};

const monthYearToDate = (monthYear: string) => {
    const [month, year] = monthYear.split("/");

    if (!month || !year) {
        throw new Error("Invalid month/year");
    }

    // Convert to a date
    const date = new Date(parseInt(year), parseInt(month) - 1);

    // Check if valid date
    if (isNaN(date.getTime())) {
        throw new Error("Invalid month/year");
    }

    return date;
};

const filterExistingSheets = async (sheets: GoogleSpreadsheetWorksheet[], skipTillAferMonthDate: Date | null) =>
    (
        sheets
            .map((sheet) => {
                const titleLowercase = sheet.title.toLocaleLowerCase();

                // Extract the month and year from the sheet title using the regex
                const result = monthYearRegex.exec(titleLowercase);

                if (!result) {
                    return null;
                }

                const sheetStartDate = monthYearToDate(result[0]);

                if (skipTillAferMonthDate && sheetStartDate <= skipTillAferMonthDate) {
                    return null;
                }

                return {
                    sheet,
                    sheetStartDate,
                };
            })
            .filter(Boolean) as SheetToProcess[]
    )
        // sort so most recent is first
        .sort((a, b) => b.sheetStartDate.getTime() - a.sheetStartDate.getTime());
