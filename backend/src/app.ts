import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errors.js';
import { authRouter } from './modules/auth/auth.router.js';
import { teamsRouter } from './modules/teams/teams.router.js';
import { tournamentRouter } from './modules/tournament/tournament.router.js';
import { groupPredictionsRouter } from './modules/groupPredictions/groupPredictions.router.js';
import { bestThirdPredictionsRouter } from './modules/bestThirdPredictions/bestThirdPredictions.router.js';
import { specialPredictionsRouter } from './modules/specialPredictions/specialPredictions.router.js';
import { matchPredictionsRouter } from './modules/matchPredictions/matchPredictions.router.js';
import { matchesRouter } from './modules/matches/matches.router.js';
import { leaderboardRouter } from './modules/leaderboard/leaderboard.router.js';
import { adminRouter } from './modules/admin/admin.router.js';
import { footballApiRouter } from './modules/footballApi/footballApi.router.js';
import { dashboardRouter } from './modules/dashboard/dashboard.router.js';
import { leaguesRouter } from './modules/leagues/leagues.router.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/teams', teamsRouter);
app.use('/api/tournament', tournamentRouter);
app.use('/api/group-predictions', groupPredictionsRouter);
app.use('/api/best-third-predictions', bestThirdPredictionsRouter);
app.use('/api/special-predictions', specialPredictionsRouter);
app.use('/api/match-predictions', matchPredictionsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);
app.use('/api/leagues', leaguesRouter);
app.use('/api/admin/football', footballApiRouter);

// Health check
app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });

// Error handler (must be last)
app.use(errorHandler);

export { app };
