import { app } from './app.js';
import { env } from './config/env.js';
import { startAutoSync } from './modules/footballApi/scheduler.js';

app.listen(env.PORT, () => {
  console.log(`Backend running on http://localhost:${env.PORT}`);
  startAutoSync(10);
});
