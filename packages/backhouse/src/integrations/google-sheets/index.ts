import { ParsedIntegration } from '@timesheeter/web';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { applyTransforms, filterExistingSheets, getSheetStart } from './sheets';
import { getDatabaseEntries, getDatabaseEntriesStartDate } from './database-entries';
import { getTransformedSheetData } from './transformer';

type GoogleSheetsIntegration = ParsedIntegration & {
  config: {
    type: 'GoogleSheetsIntegration';
  };
};

export const handleGoogleSheetsIntegration = async ({
  integration: {
    config: { commitDelayDays, serviceAccountEmail, privateKey, timesheets },
  },
}: {
  integration: GoogleSheetsIntegration;
}) => {
  for (const timesheet of timesheets) {
    // Run individually for rate limiting
    await outputToTimesheet({
      serviceAccountEmail,
      privateKey,
      commitDelayDays,
      sheetId: timesheet.sheetId,
      userId: timesheet.userId,
    });
  }
};

const outputToTimesheet = async ({
  serviceAccountEmail,
  privateKey,
  commitDelayDays,
  sheetId,
  userId,
}: {
  serviceAccountEmail: string;
  privateKey: string;
  commitDelayDays: number;
  sheetId: string;
  userId: string;
}) => {
  const doc = await authenticateGoogleSheet({
    sheetId,
    serviceAccountEmail,
    privateKey: privateKey,
  });

  const sheetsToProcess = await filterExistingSheets(doc.sheetsByIndex);

  // Last day to file is commitDelayDays ago
  const lastDayToProcess = new Date();
  lastDayToProcess.setUTCDate(lastDayToProcess.getUTCDate() - commitDelayDays);
  lastDayToProcess.setUTCHours(0, 0, 0, 0);

  let firstDayToProcess = new Date(0);

  const sheetStart = await getSheetStart(sheetsToProcess);

  if (sheetStart && sheetStart.sheetStartDate > firstDayToProcess) {
    firstDayToProcess = sheetStart.sheetStartDate;
  }

  const databaseEntries = await getDatabaseEntries({
    fromStartDate: firstDayToProcess,
    toStartDate: lastDayToProcess,
    userId,
  });

  const databaseEntriesBasedStartDate = getDatabaseEntriesStartDate(databaseEntries);

  // if no entries in database, return null
  if (!databaseEntriesBasedStartDate) {
    return null;
  }

  if (databaseEntriesBasedStartDate > firstDayToProcess) {
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

const correctPrivateKey = (privateKey: string) => privateKey.split(String.raw`\n`).join('\n');
