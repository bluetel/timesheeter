import { ukDateRegex } from '@timesheeter/web';
import axios from 'axios';
import { z } from 'zod';

const BANK_HOLIDAYS_ENDPOINT = 'https://www.gov.uk/bank-holidays.json';

const bankHolidayResponseSchema = z.object({
  'england-and-wales': z.object({
    events: z
      .object({
        date: z.string().regex(ukDateRegex),
      })
      .array(),
  }),
});

export const getBankHolidayDates = async () => {
  const response = await axios.request({
    url: BANK_HOLIDAYS_ENDPOINT,
  });

  const data = bankHolidayResponseSchema.parse(response.data);

  return data['england-and-wales'].events.map(({ date: dateString }) => {
    const [day, month, year] = dateString.split('-');

    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
  });
};
