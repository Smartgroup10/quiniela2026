import prisma from '../../lib/prisma.js';
import { scoreMatchPrediction, scoreGroupPrediction, scoreBestThirdPrediction, scoreSpecials, scoreBracketMatch } from './engine.js';

export async function recalculateAll() {
  const config = await prisma.scoringConfig.findFirst();
  if (!config) throw new Error('ScoringConfig not found');

  const tournament = await prisma.tournament.findFirst();
  const teams = await prisma.team.findMany();
  const users = await prisma.user.findMany({
    where: { role: { not: 'ADMIN' } },
    include: {
      matchPredictions: { include: { match: true } },
      groupPredictions: true,
      thirdPredictions: true,
      specials: true,
      bracketPredictions: { include: { match: true } },
    },
  });

  const teamsWithResults = teams
    .filter((t) => t.realFinalPosition != null)
    .map((t) => ({
      teamId: t.id,
      finalPosition: t.realFinalPosition as 1 | 2 | 3 | 4,
      classified: t.realClassified,
      realBestThird: t.realBestThird,
    }));

  // Build group->teams map
  const groupTeams = new Map<string, typeof teamsWithResults>();
  for (const t of teamsWithResults) {
    const team = teams.find((tm) => tm.id === t.teamId);
    if (!team?.groupKey) continue;
    const arr = groupTeams.get(team.groupKey) || [];
    arr.push(t);
    groupTeams.set(team.groupKey, arr);
  }

  for (const user of users) {
    let matchPoints = 0;
    let groupPoints = 0;
    let bestThirdPoints = 0;
    let bonusPhase1Points = 0;
    let knockoutPoints = 0;
    let bonusPhase2Points = 0;

    // Score match predictions (group stage)
    for (const mp of user.matchPredictions) {
      const match = mp.match;
      if (match.status !== 'FINISHED' || match.homeGoals == null || match.awayGoals == null) continue;

      const pts = scoreMatchPrediction(mp, {
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
      }, config);

      matchPoints += pts;
      await prisma.matchPrediction.update({ where: { id: mp.id }, data: { pointsEarned: pts } });
    }

    // Score group predictions
    for (const gp of user.groupPredictions) {
      const realGroup = groupTeams.get(gp.groupKey) || [];
      if (realGroup.length === 0) continue;
      const pts = scoreGroupPrediction(gp, realGroup, config);
      groupPoints += pts;
      await prisma.groupPrediction.update({ where: { id: gp.id }, data: { pointsEarned: pts } });
    }

    // Score best third predictions (use all teams, not just those with positions)
    const allTeamsBestThird = teams
      .filter((t) => t.realFinalPosition != null || t.realBestThird)
      .map((t) => ({ teamId: t.id, realBestThird: t.realBestThird }));

    for (const tp of user.thirdPredictions) {
      const gp = user.groupPredictions.find((g) => g.groupKey === tp.groupKey);
      if (!gp) continue;
      const thirdTeamId = gp.thirdTeamId;
      const pts = scoreBestThirdPrediction(
        { thirdTeamId, willPass: tp.willPass },
        allTeamsBestThird,
        config,
      );
      bestThirdPoints += pts;
      await prisma.bestThirdPrediction.update({ where: { id: tp.id }, data: { pointsEarned: pts } });
    }

    // Score specials
    if (user.specials && tournament) {
      const specialScores = scoreSpecials(user.specials, {
        championTeamId: tournament.realChampionTeamId,
        runnerUpTeamId: tournament.realRunnerUpTeamId,
        thirdTeamId: tournament.realThirdTeamId,
        topScorerName: tournament.realTopScorerName,
        mvpName: tournament.realMvpName,
        revelationTeamId: tournament.realRevelationTeamId,
      }, config);

      bonusPhase1Points =
        specialScores.championPoints + specialScores.runnerUpPoints +
        specialScores.thirdPoints + specialScores.topScorerPoints +
        specialScores.mvpPoints + specialScores.revelationPoints;
      bonusPhase2Points = specialScores.championPhase2Points;

      await prisma.specialPrediction.update({
        where: { id: user.specials.id },
        data: specialScores,
      });
    }

    // Score bracket predictions
    for (const bp of user.bracketPredictions) {
      const match = bp.match;
      if (match.status !== 'FINISHED' || match.homeGoals == null || match.awayGoals == null || !match.winnerTeamId) continue;

      const pts = scoreBracketMatch(bp, {
        homeTeamId: match.homeTeamId!,
        awayTeamId: match.awayTeamId!,
        homeGoals: match.homeGoals,
        awayGoals: match.awayGoals,
        winnerTeamId: match.winnerTeamId,
        wentToPenalties: match.wentToPenalties,
      }, config);

      knockoutPoints += pts;
      await prisma.bracketPrediction.update({ where: { id: bp.id }, data: { pointsEarned: pts } });
    }

    const totalPoints = matchPoints + groupPoints + bestThirdPoints + bonusPhase1Points + knockoutPoints + bonusPhase2Points;

    await prisma.user.update({
      where: { id: user.id },
      data: { matchPoints, groupPoints, bestThirdPoints, bonusPhase1Points, knockoutPoints, bonusPhase2Points, totalPoints },
    });
  }

  return { usersRecalculated: users.length };
}
