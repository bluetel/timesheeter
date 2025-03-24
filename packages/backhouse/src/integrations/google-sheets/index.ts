import { getPrismaClient, type ParsedIntegration } from '@timesheeter/web';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import {applyTransforms, filterExistingSheets, getDefaultStartDate, getSheetStart} from './sheets';
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
    workspaceId,
  },
}: {
  integration: GoogleSheetsIntegration;
}) => {
  const prisma = await getPrismaClient();

  for (const timesheet of timesheets) {
    // Run sequentially for rate limiting
    // We also want to catch any errors in a single sheet and continue processing the rest
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: timesheet.userId,
        },
      });

      if (!user) {
        console.error(`User ${timesheet.userId} not found`);
        continue;
      }

      console.log(`Processing timesheet ${timesheet.sheetId} for user ${user.name} (${user.email})`);

      await outputToTimesheet({
        serviceAccountEmail,
        privateKey,
        commitDelayDays,
        sheetId: timesheet.sheetId,
        userId: timesheet.userId,
        workspaceId,
      });
    } catch (e) {
      console.error(e);
    }
  }
};

const outputToTimesheet = async ({
  serviceAccountEmail,
  privateKey,
  commitDelayDays,
  sheetId,
  userId,
  workspaceId,
}: {
  serviceAccountEmail: string;
  privateKey: string;
  commitDelayDays: number;
  sheetId: string;
  userId: string;
  workspaceId: string;
}) => {
  const doc = await authenticateGoogleSheet({
    sheetId,
    serviceAccountEmail,
    privateKey: privateKey,
  });

  const sheetsToProcess = filterExistingSheets(doc.sheetsByIndex);

  // Last day to file is commitDelayDays ago
  const lastDayToProcess = new Date();
  lastDayToProcess.setUTCDate(lastDayToProcess.getUTCDate() - commitDelayDays);
  lastDayToProcess.setUTCHours(0, 0, 0, 0);

  // First day to process should be start of last month
  const startSheet = await getSheetStart(sheetsToProcess)
  let firstDayToProcess = startSheet?.sheetStartDate ?? getDefaultStartDate()

  // grab the entries for these dates
  const databaseEntries = await getDatabaseEntries({
    fromStartDate: firstDayToProcess,
    toStartDate: lastDayToProcess,
    userId,
    workspaceId,
  });

  const databaseEntriesBasedStartDate = getDatabaseEntriesStartDate(databaseEntries);

  // if no entries in database, return null
  if (!databaseEntriesBasedStartDate) {
    return
  }

  // We can't process entries before when we first started recording them
  if (databaseEntriesBasedStartDate > firstDayToProcess) {
    firstDayToProcess = databaseEntriesBasedStartDate;
  }

  const transformedData = await getTransformedSheetData({
    databaseEntries,
    firstDayToProcess,
    lastDayToProcess,
  });

  await applyTransforms({
    transformedData,
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
