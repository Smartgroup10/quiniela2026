import { syncResults } from './footballApi.service.js';
import { env } from '../../config/env.js';

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMinutes = 10) {
  if (!env.FOOTBALL_API_KEY || !env.FOOTBALL_API_ENABLED) {
    console.log('[AutoSync] Desactivado (FOOTBALL_API_KEY o FOOTBALL_API_ENABLED no configurados)');
    return;
  }

  console.log(`[AutoSync] Activado — cada ${intervalMinutes} minutos`);

  intervalId = setInterval(async () => {
    try {
      const result = await syncResults();
      if (result.matchesUpdated > 0) {
        console.log(`[AutoSync] ${result.matchesUpdated} partidos actualizados`);
      }
    } catch (err) {
      console.error('[AutoSync] Error:', err instanceof Error ? err.message : err);
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopAutoSync() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
