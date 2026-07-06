import { app } from './app.js';
import { env } from './config/env.js';
import { startAutoSync } from './modules/footballApi/scheduler.js';
import { startDailyEmailScheduler } from './modules/email/dailyEmailScheduler.js';

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
  startAutoSync(10);
  if (process.env.DAILY_EMAIL_ENABLED === 'true') {
    startDailyEmailScheduler(5);
  } else {
    console.log('[DailyEmail] Desactivado (DAILY_EMAIL_ENABLED != true)');
  }
});
