import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const { hash } = bcrypt;

const prisma = new PrismaClient();

const TEAMS = [
  // Group A
  { code: 'MEX', name: 'México', groupKey: 'A', flag: '🇲🇽' },
  { code: 'RSA', name: 'Sudáfrica', groupKey: 'A', flag: '🇿🇦' },
  { code: 'KOR', name: 'Corea del Sur', groupKey: 'A', flag: '🇰🇷' },
  { code: 'CZE', name: 'Chequia', groupKey: 'A', flag: '🇨🇿' },
  // Group B
  { code: 'CAN', name: 'Canadá', groupKey: 'B', flag: '🇨🇦' },
  { code: 'SUI', name: 'Suiza', groupKey: 'B', flag: '🇨🇭' },
  { code: 'QAT', name: 'Catar', groupKey: 'B', flag: '🇶🇦' },
  { code: 'BIH', name: 'Bosnia y Herzegovina', groupKey: 'B', flag: '🇧🇦' },
  // Group C
  { code: 'BRA', name: 'Brasil', groupKey: 'C', flag: '🇧🇷' },
  { code: 'MAR', name: 'Marruecos', groupKey: 'C', flag: '🇲🇦' },
  { code: 'HAI', name: 'Haití', groupKey: 'C', flag: '🇭🇹' },
  { code: 'SCO', name: 'Escocia', groupKey: 'C', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  // Group D
  { code: 'USA', name: 'Estados Unidos', groupKey: 'D', flag: '🇺🇸' },
  { code: 'PAR', name: 'Paraguay', groupKey: 'D', flag: '🇵🇾' },
  { code: 'AUS', name: 'Australia', groupKey: 'D', flag: '🇦🇺' },
  { code: 'TUR', name: 'Turquía', groupKey: 'D', flag: '🇹🇷' },
  // Group E
  { code: 'GER', name: 'Alemania', groupKey: 'E', flag: '🇩🇪' },
  { code: 'CUW', name: 'Curazao', groupKey: 'E', flag: '🇨🇼' },
  { code: 'CIV', name: 'Costa de Marfil', groupKey: 'E', flag: '🇨🇮' },
  { code: 'ECU', name: 'Ecuador', groupKey: 'E', flag: '🇪🇨' },
  // Group F
  { code: 'NED', name: 'Países Bajos', groupKey: 'F', flag: '🇳🇱' },
  { code: 'JPN', name: 'Japón', groupKey: 'F', flag: '🇯🇵' },
  { code: 'SWE', name: 'Suecia', groupKey: 'F', flag: '🇸🇪' },
  { code: 'TUN', name: 'Túnez', groupKey: 'F', flag: '🇹🇳' },
  // Group G
  { code: 'BEL', name: 'Bélgica', groupKey: 'G', flag: '🇧🇪' },
  { code: 'EGY', name: 'Egipto', groupKey: 'G', flag: '🇪🇬' },
  { code: 'IRN', name: 'Irán', groupKey: 'G', flag: '🇮🇷' },
  { code: 'NZL', name: 'Nueva Zelanda', groupKey: 'G', flag: '🇳🇿' },
  // Group H
  { code: 'ESP', name: 'España', groupKey: 'H', flag: '🇪🇸' },
  { code: 'CPV', name: 'Cabo Verde', groupKey: 'H', flag: '🇨🇻' },
  { code: 'KSA', name: 'Arabia Saudita', groupKey: 'H', flag: '🇸🇦' },
  { code: 'URU', name: 'Uruguay', groupKey: 'H', flag: '🇺🇾' },
  // Group I
  { code: 'FRA', name: 'Francia', groupKey: 'I', flag: '🇫🇷' },
  { code: 'SEN', name: 'Senegal', groupKey: 'I', flag: '🇸🇳' },
  { code: 'NOR', name: 'Noruega', groupKey: 'I', flag: '🇳🇴' },
  { code: 'IRQ', name: 'Irak', groupKey: 'I', flag: '🇮🇶' },
  // Group J
  { code: 'ARG', name: 'Argentina', groupKey: 'J', flag: '🇦🇷' },
  { code: 'ALG', name: 'Argelia', groupKey: 'J', flag: '🇩🇿' },
  { code: 'AUT', name: 'Austria', groupKey: 'J', flag: '🇦🇹' },
  { code: 'JOR', name: 'Jordania', groupKey: 'J', flag: '🇯🇴' },
  // Group K
  { code: 'POR', name: 'Portugal', groupKey: 'K', flag: '🇵🇹' },
  { code: 'COD', name: 'RD Congo', groupKey: 'K', flag: '🇨🇩' },
  { code: 'UZB', name: 'Uzbekistán', groupKey: 'K', flag: '🇺🇿' },
  { code: 'COL', name: 'Colombia', groupKey: 'K', flag: '🇨🇴' },
  // Group L
  { code: 'ENG', name: 'Inglaterra', groupKey: 'L', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'CRO', name: 'Croacia', groupKey: 'L', flag: '🇭🇷' },
  { code: 'GHA', name: 'Ghana', groupKey: 'L', flag: '🇬🇭' },
  { code: 'PAN', name: 'Panamá', groupKey: 'L', flag: '🇵🇦' },
];

// 72 group stage matches - FIFA World Cup 2026
// Dates/times in UTC. Venues from official schedule.
interface MatchSeed {
  matchNumber: number;
  homeCode: string;
  awayCode: string;
  kickoffAt: string; // ISO UTC
  venue: string;
  groupKey: string;
}

const GROUP_MATCHES: MatchSeed[] = [
  // Matchday 1
  { matchNumber: 1,  homeCode: 'MEX', awayCode: 'RSA', kickoffAt: '2026-06-11T22:00:00Z', venue: 'Estadio Azteca, Ciudad de México', groupKey: 'A' },
  { matchNumber: 2,  homeCode: 'USA', awayCode: 'PAR', kickoffAt: '2026-06-12T00:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'D' },
  { matchNumber: 3,  homeCode: 'CAN', awayCode: 'SUI', kickoffAt: '2026-06-12T17:00:00Z', venue: 'BC Place, Vancouver', groupKey: 'B' },
  { matchNumber: 4,  homeCode: 'KOR', awayCode: 'CZE', kickoffAt: '2026-06-12T20:00:00Z', venue: 'Estadio Azteca, Ciudad de México', groupKey: 'A' },
  { matchNumber: 5,  homeCode: 'BRA', awayCode: 'MAR', kickoffAt: '2026-06-12T23:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'C' },
  { matchNumber: 6,  homeCode: 'AUS', awayCode: 'TUR', kickoffAt: '2026-06-13T01:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'D' },
  { matchNumber: 7,  homeCode: 'GER', awayCode: 'CUW', kickoffAt: '2026-06-13T17:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'E' },
  { matchNumber: 8,  homeCode: 'NED', awayCode: 'JPN', kickoffAt: '2026-06-13T20:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'F' },
  { matchNumber: 9,  homeCode: 'QAT', awayCode: 'BIH', kickoffAt: '2026-06-13T23:00:00Z', venue: 'BMO Stadium, Toronto', groupKey: 'B' },
  { matchNumber: 10, homeCode: 'HAI', awayCode: 'SCO', kickoffAt: '2026-06-14T01:00:00Z', venue: 'Lumen Field, Seattle', groupKey: 'C' },
  { matchNumber: 11, homeCode: 'BEL', awayCode: 'EGY', kickoffAt: '2026-06-14T17:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'G' },
  { matchNumber: 12, homeCode: 'ESP', awayCode: 'CPV', kickoffAt: '2026-06-14T20:00:00Z', venue: 'AT&T Stadium, Dallas', groupKey: 'H' },
  { matchNumber: 13, homeCode: 'CIV', awayCode: 'ECU', kickoffAt: '2026-06-14T23:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'E' },
  { matchNumber: 14, homeCode: 'SWE', awayCode: 'TUN', kickoffAt: '2026-06-15T01:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'F' },
  { matchNumber: 15, homeCode: 'FRA', awayCode: 'SEN', kickoffAt: '2026-06-15T17:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'I' },
  { matchNumber: 16, homeCode: 'ARG', awayCode: 'ALG', kickoffAt: '2026-06-15T20:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'J' },
  { matchNumber: 17, homeCode: 'IRN', awayCode: 'NZL', kickoffAt: '2026-06-15T23:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'G' },
  { matchNumber: 18, homeCode: 'KSA', awayCode: 'URU', kickoffAt: '2026-06-16T01:00:00Z', venue: 'AT&T Stadium, Dallas', groupKey: 'H' },
  { matchNumber: 19, homeCode: 'POR', awayCode: 'COD', kickoffAt: '2026-06-16T17:00:00Z', venue: 'Gillette Stadium, Boston', groupKey: 'K' },
  { matchNumber: 20, homeCode: 'ENG', awayCode: 'CRO', kickoffAt: '2026-06-16T20:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'L' },
  { matchNumber: 21, homeCode: 'NOR', awayCode: 'IRQ', kickoffAt: '2026-06-16T23:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'I' },
  { matchNumber: 22, homeCode: 'AUT', awayCode: 'JOR', kickoffAt: '2026-06-17T01:00:00Z', venue: 'Levi\'s Stadium, San Francisco', groupKey: 'J' },
  { matchNumber: 23, homeCode: 'UZB', awayCode: 'COL', kickoffAt: '2026-06-17T17:00:00Z', venue: 'Gillette Stadium, Boston', groupKey: 'K' },
  { matchNumber: 24, homeCode: 'GHA', awayCode: 'PAN', kickoffAt: '2026-06-17T20:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'L' },

  // Matchday 2
  { matchNumber: 25, homeCode: 'MEX', awayCode: 'CZE', kickoffAt: '2026-06-17T23:00:00Z', venue: 'Estadio BBVA, Monterrey', groupKey: 'A' },
  { matchNumber: 26, homeCode: 'RSA', awayCode: 'KOR', kickoffAt: '2026-06-18T01:00:00Z', venue: 'Estadio Azteca, Ciudad de México', groupKey: 'A' },
  { matchNumber: 27, homeCode: 'USA', awayCode: 'TUR', kickoffAt: '2026-06-18T17:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'D' },
  { matchNumber: 28, homeCode: 'CAN', awayCode: 'BIH', kickoffAt: '2026-06-18T20:00:00Z', venue: 'BC Place, Vancouver', groupKey: 'B' },
  { matchNumber: 29, homeCode: 'BRA', awayCode: 'SCO', kickoffAt: '2026-06-18T23:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'C' },
  { matchNumber: 30, homeCode: 'PAR', awayCode: 'AUS', kickoffAt: '2026-06-19T01:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'D' },
  { matchNumber: 31, homeCode: 'SUI', awayCode: 'QAT', kickoffAt: '2026-06-19T17:00:00Z', venue: 'BMO Stadium, Toronto', groupKey: 'B' },
  { matchNumber: 32, homeCode: 'MAR', awayCode: 'HAI', kickoffAt: '2026-06-19T20:00:00Z', venue: 'Lumen Field, Seattle', groupKey: 'C' },
  { matchNumber: 33, homeCode: 'GER', awayCode: 'ECU', kickoffAt: '2026-06-19T23:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'E' },
  { matchNumber: 34, homeCode: 'NED', awayCode: 'TUN', kickoffAt: '2026-06-20T01:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'F' },
  { matchNumber: 35, homeCode: 'BEL', awayCode: 'NZL', kickoffAt: '2026-06-20T17:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'G' },
  { matchNumber: 36, homeCode: 'ESP', awayCode: 'URU', kickoffAt: '2026-06-20T20:00:00Z', venue: 'AT&T Stadium, Dallas', groupKey: 'H' },
  { matchNumber: 37, homeCode: 'CUW', awayCode: 'CIV', kickoffAt: '2026-06-20T23:00:00Z', venue: 'Gillette Stadium, Boston', groupKey: 'E' },
  { matchNumber: 38, homeCode: 'JPN', awayCode: 'SWE', kickoffAt: '2026-06-21T01:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'F' },
  { matchNumber: 39, homeCode: 'FRA', awayCode: 'IRQ', kickoffAt: '2026-06-21T17:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'I' },
  { matchNumber: 40, homeCode: 'ARG', awayCode: 'JOR', kickoffAt: '2026-06-21T20:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'J' },
  { matchNumber: 41, homeCode: 'EGY', awayCode: 'IRN', kickoffAt: '2026-06-21T23:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'G' },
  { matchNumber: 42, homeCode: 'CPV', awayCode: 'KSA', kickoffAt: '2026-06-22T01:00:00Z', venue: 'AT&T Stadium, Dallas', groupKey: 'H' },
  { matchNumber: 43, homeCode: 'POR', awayCode: 'COL', kickoffAt: '2026-06-22T17:00:00Z', venue: 'Gillette Stadium, Boston', groupKey: 'K' },
  { matchNumber: 44, homeCode: 'ENG', awayCode: 'PAN', kickoffAt: '2026-06-22T20:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'L' },
  { matchNumber: 45, homeCode: 'SEN', awayCode: 'NOR', kickoffAt: '2026-06-22T23:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'I' },
  { matchNumber: 46, homeCode: 'ALG', awayCode: 'AUT', kickoffAt: '2026-06-23T01:00:00Z', venue: 'Levi\'s Stadium, San Francisco', groupKey: 'J' },
  { matchNumber: 47, homeCode: 'COD', awayCode: 'UZB', kickoffAt: '2026-06-23T17:00:00Z', venue: 'Gillette Stadium, Boston', groupKey: 'K' },
  { matchNumber: 48, homeCode: 'CRO', awayCode: 'GHA', kickoffAt: '2026-06-23T20:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'L' },

  // Matchday 3
  { matchNumber: 49, homeCode: 'RSA', awayCode: 'CZE', kickoffAt: '2026-06-23T23:00:00Z', venue: 'Estadio BBVA, Monterrey', groupKey: 'A' },
  { matchNumber: 50, homeCode: 'MEX', awayCode: 'KOR', kickoffAt: '2026-06-23T23:00:00Z', venue: 'Estadio Azteca, Ciudad de México', groupKey: 'A' },
  { matchNumber: 51, homeCode: 'SUI', awayCode: 'BIH', kickoffAt: '2026-06-24T17:00:00Z', venue: 'BMO Stadium, Toronto', groupKey: 'B' },
  { matchNumber: 52, homeCode: 'CAN', awayCode: 'QAT', kickoffAt: '2026-06-24T17:00:00Z', venue: 'BC Place, Vancouver', groupKey: 'B' },
  { matchNumber: 53, homeCode: 'MAR', awayCode: 'SCO', kickoffAt: '2026-06-24T20:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'C' },
  { matchNumber: 54, homeCode: 'BRA', awayCode: 'HAI', kickoffAt: '2026-06-24T20:00:00Z', venue: 'Lumen Field, Seattle', groupKey: 'C' },
  { matchNumber: 55, homeCode: 'PAR', awayCode: 'TUR', kickoffAt: '2026-06-24T23:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'D' },
  { matchNumber: 56, homeCode: 'USA', awayCode: 'AUS', kickoffAt: '2026-06-24T23:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'D' },
  { matchNumber: 57, homeCode: 'CUW', awayCode: 'ECU', kickoffAt: '2026-06-25T17:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'E' },
  { matchNumber: 58, homeCode: 'GER', awayCode: 'CIV', kickoffAt: '2026-06-25T17:00:00Z', venue: 'Gillette Stadium, Boston', groupKey: 'E' },
  { matchNumber: 59, homeCode: 'JPN', awayCode: 'TUN', kickoffAt: '2026-06-25T20:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'F' },
  { matchNumber: 60, homeCode: 'NED', awayCode: 'SWE', kickoffAt: '2026-06-25T20:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'F' },
  { matchNumber: 61, homeCode: 'EGY', awayCode: 'NZL', kickoffAt: '2026-06-25T23:00:00Z', venue: 'AT&T Stadium, Dallas', groupKey: 'G' },
  { matchNumber: 62, homeCode: 'BEL', awayCode: 'IRN', kickoffAt: '2026-06-25T23:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'G' },
  { matchNumber: 63, homeCode: 'CPV', awayCode: 'URU', kickoffAt: '2026-06-26T01:00:00Z', venue: 'AT&T Stadium, Dallas', groupKey: 'H' },
  { matchNumber: 64, homeCode: 'ESP', awayCode: 'KSA', kickoffAt: '2026-06-26T01:00:00Z', venue: 'Estadio BBVA, Monterrey', groupKey: 'H' },
  { matchNumber: 65, homeCode: 'SEN', awayCode: 'IRQ', kickoffAt: '2026-06-26T17:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'I' },
  { matchNumber: 66, homeCode: 'FRA', awayCode: 'NOR', kickoffAt: '2026-06-26T17:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'I' },
  { matchNumber: 67, homeCode: 'ALG', awayCode: 'JOR', kickoffAt: '2026-06-26T20:00:00Z', venue: 'Levi\'s Stadium, San Francisco', groupKey: 'J' },
  { matchNumber: 68, homeCode: 'ARG', awayCode: 'AUT', kickoffAt: '2026-06-26T20:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'J' },
  { matchNumber: 69, homeCode: 'COD', awayCode: 'COL', kickoffAt: '2026-06-26T23:00:00Z', venue: 'Gillette Stadium, Boston', groupKey: 'K' },
  { matchNumber: 70, homeCode: 'POR', awayCode: 'UZB', kickoffAt: '2026-06-26T23:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'K' },
  { matchNumber: 71, homeCode: 'CRO', awayCode: 'PAN', kickoffAt: '2026-06-27T01:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'L' },
  { matchNumber: 72, homeCode: 'ENG', awayCode: 'GHA', kickoffAt: '2026-06-27T01:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'L' },
];

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.bracketPrediction.deleteMany();
  await prisma.specialPrediction.deleteMany();
  await prisma.bestThirdPrediction.deleteMany();
  await prisma.groupPrediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.scoringConfig.deleteMany();

  // 1. Create teams
  const teamMap = new Map<string, string>();
  for (const t of TEAMS) {
    const team = await prisma.team.create({
      data: {
        code: t.code,
        name: t.name,
        flagUrl: t.flag,
        groupKey: t.groupKey,
      },
    });
    teamMap.set(t.code, team.id);
  }
  console.log(`Created ${TEAMS.length} teams`);

  // 2. Create group stage matches
  for (const m of GROUP_MATCHES) {
    await prisma.match.create({
      data: {
        stage: 'GROUP',
        matchNumber: m.matchNumber,
        kickoffAt: new Date(m.kickoffAt),
        venue: m.venue,
        homeTeamId: teamMap.get(m.homeCode)!,
        awayTeamId: teamMap.get(m.awayCode)!,
      },
    });
  }
  console.log(`Created ${GROUP_MATCHES.length} group stage matches`);

  // 3. Create tournament
  await prisma.tournament.create({
    data: {
      name: 'Mundial 2026',
      phase1OpensAt: new Date(),
      phase1ClosesAt: new Date('2026-06-11T22:00:00Z'), // kick-off 1st match
      status: 'PHASE1_OPEN',
    },
  });
  console.log('Created tournament');

  // 4. Create scoring config with defaults
  await prisma.scoringConfig.create({ data: {} });
  console.log('Created scoring config');

  // 5. Create admin user
  const adminPassword = await hash('Admin123!', 10);
  await prisma.user.create({
    data: {
      email: 'admin@smartgroup.es',
      password: adminPassword,
      name: 'Administrador',
      alias: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('Created admin user: admin@smartgroup.es / Admin123!');

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
