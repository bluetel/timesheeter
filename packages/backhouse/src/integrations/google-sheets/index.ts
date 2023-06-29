import { ParsedIntegration } from "@timesheeter/app";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { applyTransforms, filterExistingSheets, getSheetStart } from "./sheets";
import { getDatabaseEntries, getDatabaseEntriesStartDate } from "./database-entries";
import { monthYearToDate } from "./dates";
import { getTransformedSheetData } from "./transformer";

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
    const doc = await authenticateGoogleSheet({
        sheetId,
        serviceAccountEmail,
        privateKey: privateKey,
    });

    const skipTillAfterMonthDate = skipTillAfterMonth ? monthYearToDate(skipTillAfterMonth) : null;

    const sheetsToProcess = await filterExistingSheets(doc.sheetsByIndex, skipTillAfterMonthDate);

    // Last day to file is commitDelayDays ago
    const lastDayToProcess = new Date();
    lastDayToProcess.setUTCDate(lastDayToProcess.getUTCDate() - commitDelayDays);
    lastDayToProcess.setUTCHours(0, 0, 0, 0);

    let firstDayToProcess = new Date(0);

    if (skipTillAfterMonthDate) {
        firstDayToProcess.setUTCDate(1);
        // Get the first day of the month after the month of skipTillAfterMonth ie one month later
        firstDayToProcess.setUTCMonth(skipTillAfterMonthDate.getUTCMonth() + 1);
    }
    const sheetStart = await getSheetStart(sheetsToProcess);

    if (sheetStart && sheetStart.sheetStartDate > firstDayToProcess) {
        firstDayToProcess = sheetStart.sheetStartDate;
    }

    const databaseEntries = await getDatabaseEntries({
        fromStartDate: firstDayToProcess,
        toStartDate: lastDayToProcess,
    });

    // If both are empty, return null
    if (databaseEntries.holidays.length === 0 && databaseEntries.timesheetEntries.length === 0) {
        return null;
    }

    const databaseEntriesBasedStartDate = getDatabaseEntriesStartDate(databaseEntries);

    if (databaseEntriesBasedStartDate && databaseEntriesBasedStartDate > firstDayToProcess) {
        firstDayToProcess = databaseEntriesBasedStartDate;
    }

    const transformedData = await getTransformedSheetData({
        databaseEntries,
        firstDayToProcess,
        lastDayToProcess,
    });

    applyTransforms({
        transformedData,
        sheetStart,
        doc,
        firstDayToProcess,
        lastDayToProcess,
    });
};

const authenticateGoogleSheet = async ({
    sheetId,
    serviceAccountEmail,
    privateKey,
}: {
    sheetId: string;
    serviceAccountEmail: string;
    privateKey: string;
}) => {
    const privateKeyCorrected = correctPrivateKey(privateKey);

    const doc = new GoogleSpreadsheet(sheetId);

    await doc.useServiceAccountAuth({
        client_email: serviceAccountEmail,
        private_key: privateKeyCorrected,
    });

    await doc.loadInfo();

    return doc;
};

const correctPrivateKey = (privateKey: string) => privateKey.split(String.raw`\n`).join("\n");
