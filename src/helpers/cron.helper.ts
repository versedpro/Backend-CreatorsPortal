import cron from 'node-cron';
import { KnexHelper } from './knex.helper';

export function cronUpdateExpiredInvites() {
  cron.schedule('*/15 * * * *', async () => {
    await KnexHelper.updateExpiredInvites();
  });
}

export function cronDeleteExpiredUserTokens() {
  cron.schedule('*/10 * * * *', async () => {
    await KnexHelper.deleteExpiredTokens();
  });
}
