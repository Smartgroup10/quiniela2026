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
  // === Matchday 1 ===
  // June 11
  { matchNumber: 1,  homeCode: 'MEX', awayCode: 'RSA', kickoffAt: '2026-06-11T19:00:00Z', venue: 'Estadio Azteca, Ciudad de México', groupKey: 'A' },
  { matchNumber: 2,  homeCode: 'KOR', awayCode: 'CZE', kickoffAt: '2026-06-12T02:00:00Z', venue: 'Estadio Akron, Guadalajara', groupKey: 'A' },
  // June 12
  { matchNumber: 3,  homeCode: 'CAN', awayCode: 'BIH', kickoffAt: '2026-06-12T19:00:00Z', venue: 'BMO Field, Toronto', groupKey: 'B' },
  { matchNumber: 4,  homeCode: 'USA', awayCode: 'PAR', kickoffAt: '2026-06-13T01:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'D' },
  // June 13
  { matchNumber: 5,  homeCode: 'QAT', awayCode: 'SUI', kickoffAt: '2026-06-13T19:00:00Z', venue: 'Levi\'s Stadium, Santa Clara', groupKey: 'B' },
  { matchNumber: 6,  homeCode: 'BRA', awayCode: 'MAR', kickoffAt: '2026-06-13T22:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'C' },
  { matchNumber: 7,  homeCode: 'HAI', awayCode: 'SCO', kickoffAt: '2026-06-14T01:00:00Z', venue: 'Gillette Stadium, Foxborough', groupKey: 'C' },
  // June 14
  { matchNumber: 8,  homeCode: 'AUS', awayCode: 'TUR', kickoffAt: '2026-06-14T04:00:00Z', venue: 'BC Place, Vancouver', groupKey: 'D' },
  { matchNumber: 9,  homeCode: 'GER', awayCode: 'CUW', kickoffAt: '2026-06-14T17:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'E' },
  { matchNumber: 10, homeCode: 'NED', awayCode: 'JPN', kickoffAt: '2026-06-14T20:00:00Z', venue: 'AT&T Stadium, Arlington', groupKey: 'F' },
  { matchNumber: 11, homeCode: 'CIV', awayCode: 'ECU', kickoffAt: '2026-06-14T23:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'E' },
  { matchNumber: 12, homeCode: 'SWE', awayCode: 'TUN', kickoffAt: '2026-06-15T02:00:00Z', venue: 'Estadio BBVA, Monterrey', groupKey: 'F' },
  // June 15
  { matchNumber: 13, homeCode: 'ESP', awayCode: 'CPV', kickoffAt: '2026-06-15T16:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'H' },
  { matchNumber: 14, homeCode: 'BEL', awayCode: 'EGY', kickoffAt: '2026-06-15T19:00:00Z', venue: 'Lumen Field, Seattle', groupKey: 'G' },
  { matchNumber: 15, homeCode: 'KSA', awayCode: 'URU', kickoffAt: '2026-06-15T22:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'H' },
  { matchNumber: 16, homeCode: 'IRN', awayCode: 'NZL', kickoffAt: '2026-06-16T01:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'G' },
  // June 16
  { matchNumber: 17, homeCode: 'FRA', awayCode: 'SEN', kickoffAt: '2026-06-16T19:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'I' },
  { matchNumber: 18, homeCode: 'IRQ', awayCode: 'NOR', kickoffAt: '2026-06-16T22:00:00Z', venue: 'Gillette Stadium, Foxborough', groupKey: 'I' },
  { matchNumber: 19, homeCode: 'ARG', awayCode: 'ALG', kickoffAt: '2026-06-17T01:00:00Z', venue: 'Arrowhead Stadium, Kansas City', groupKey: 'J' },
  // June 17
  { matchNumber: 20, homeCode: 'AUT', awayCode: 'JOR', kickoffAt: '2026-06-17T04:00:00Z', venue: 'Levi\'s Stadium, Santa Clara', groupKey: 'J' },
  { matchNumber: 21, homeCode: 'POR', awayCode: 'COD', kickoffAt: '2026-06-17T17:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'K' },
  { matchNumber: 22, homeCode: 'ENG', awayCode: 'CRO', kickoffAt: '2026-06-17T20:00:00Z', venue: 'AT&T Stadium, Arlington', groupKey: 'L' },
  { matchNumber: 23, homeCode: 'GHA', awayCode: 'PAN', kickoffAt: '2026-06-17T23:00:00Z', venue: 'BMO Field, Toronto', groupKey: 'L' },
  { matchNumber: 24, homeCode: 'UZB', awayCode: 'COL', kickoffAt: '2026-06-18T02:00:00Z', venue: 'Estadio Azteca, Ciudad de México', groupKey: 'K' },

  // === Matchday 2 ===
  // June 18
  { matchNumber: 25, homeCode: 'CZE', awayCode: 'RSA', kickoffAt: '2026-06-18T16:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'A' },
  { matchNumber: 26, homeCode: 'SUI', awayCode: 'BIH', kickoffAt: '2026-06-18T19:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'B' },
  { matchNumber: 27, homeCode: 'CAN', awayCode: 'QAT', kickoffAt: '2026-06-18T22:00:00Z', venue: 'BC Place, Vancouver', groupKey: 'B' },
  { matchNumber: 28, homeCode: 'MEX', awayCode: 'KOR', kickoffAt: '2026-06-19T01:00:00Z', venue: 'Estadio Akron, Guadalajara', groupKey: 'A' },
  // June 19
  { matchNumber: 29, homeCode: 'USA', awayCode: 'AUS', kickoffAt: '2026-06-19T19:00:00Z', venue: 'Lumen Field, Seattle', groupKey: 'D' },
  { matchNumber: 30, homeCode: 'SCO', awayCode: 'MAR', kickoffAt: '2026-06-19T22:00:00Z', venue: 'Gillette Stadium, Foxborough', groupKey: 'C' },
  { matchNumber: 31, homeCode: 'BRA', awayCode: 'HAI', kickoffAt: '2026-06-20T00:30:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'C' },
  { matchNumber: 32, homeCode: 'TUR', awayCode: 'PAR', kickoffAt: '2026-06-20T03:00:00Z', venue: 'Levi\'s Stadium, Santa Clara', groupKey: 'D' },
  // June 20
  { matchNumber: 33, homeCode: 'NED', awayCode: 'SWE', kickoffAt: '2026-06-20T17:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'F' },
  { matchNumber: 34, homeCode: 'GER', awayCode: 'CIV', kickoffAt: '2026-06-20T20:00:00Z', venue: 'BMO Field, Toronto', groupKey: 'E' },
  { matchNumber: 35, homeCode: 'ECU', awayCode: 'CUW', kickoffAt: '2026-06-21T00:00:00Z', venue: 'Arrowhead Stadium, Kansas City', groupKey: 'E' },
  // June 21
  { matchNumber: 36, homeCode: 'TUN', awayCode: 'JPN', kickoffAt: '2026-06-21T04:00:00Z', venue: 'Estadio BBVA, Monterrey', groupKey: 'F' },
  { matchNumber: 37, homeCode: 'ESP', awayCode: 'KSA', kickoffAt: '2026-06-21T16:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'H' },
  { matchNumber: 38, homeCode: 'BEL', awayCode: 'IRN', kickoffAt: '2026-06-21T19:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'G' },
  { matchNumber: 39, homeCode: 'URU', awayCode: 'CPV', kickoffAt: '2026-06-21T22:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'H' },
  { matchNumber: 40, homeCode: 'NZL', awayCode: 'EGY', kickoffAt: '2026-06-22T01:00:00Z', venue: 'BC Place, Vancouver', groupKey: 'G' },
  // June 22
  { matchNumber: 41, homeCode: 'ARG', awayCode: 'AUT', kickoffAt: '2026-06-22T17:00:00Z', venue: 'AT&T Stadium, Arlington', groupKey: 'J' },
  { matchNumber: 42, homeCode: 'FRA', awayCode: 'IRQ', kickoffAt: '2026-06-22T21:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'I' },
  { matchNumber: 43, homeCode: 'NOR', awayCode: 'SEN', kickoffAt: '2026-06-23T00:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'I' },
  { matchNumber: 44, homeCode: 'JOR', awayCode: 'ALG', kickoffAt: '2026-06-23T03:00:00Z', venue: 'Levi\'s Stadium, Santa Clara', groupKey: 'J' },
  // June 23
  { matchNumber: 45, homeCode: 'POR', awayCode: 'UZB', kickoffAt: '2026-06-23T17:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'K' },
  { matchNumber: 46, homeCode: 'ENG', awayCode: 'GHA', kickoffAt: '2026-06-23T20:00:00Z', venue: 'Gillette Stadium, Foxborough', groupKey: 'L' },
  { matchNumber: 47, homeCode: 'PAN', awayCode: 'CRO', kickoffAt: '2026-06-23T23:00:00Z', venue: 'BMO Field, Toronto', groupKey: 'L' },
  { matchNumber: 48, homeCode: 'COL', awayCode: 'COD', kickoffAt: '2026-06-24T02:00:00Z', venue: 'Estadio Akron, Guadalajara', groupKey: 'K' },

  // === Matchday 3 ===
  // June 24
  { matchNumber: 49, homeCode: 'SUI', awayCode: 'CAN', kickoffAt: '2026-06-24T19:00:00Z', venue: 'BC Place, Vancouver', groupKey: 'B' },
  { matchNumber: 50, homeCode: 'BIH', awayCode: 'QAT', kickoffAt: '2026-06-24T19:00:00Z', venue: 'Lumen Field, Seattle', groupKey: 'B' },
  { matchNumber: 51, homeCode: 'SCO', awayCode: 'BRA', kickoffAt: '2026-06-24T22:00:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'C' },
  { matchNumber: 52, homeCode: 'MAR', awayCode: 'HAI', kickoffAt: '2026-06-24T22:00:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'C' },
  { matchNumber: 53, homeCode: 'CZE', awayCode: 'MEX', kickoffAt: '2026-06-25T01:00:00Z', venue: 'Estadio Azteca, Ciudad de México', groupKey: 'A' },
  { matchNumber: 54, homeCode: 'RSA', awayCode: 'KOR', kickoffAt: '2026-06-25T01:00:00Z', venue: 'Estadio BBVA, Monterrey', groupKey: 'A' },
  // June 25
  { matchNumber: 55, homeCode: 'CUW', awayCode: 'CIV', kickoffAt: '2026-06-25T20:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'E' },
  { matchNumber: 56, homeCode: 'ECU', awayCode: 'GER', kickoffAt: '2026-06-25T20:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'E' },
  { matchNumber: 57, homeCode: 'JPN', awayCode: 'SWE', kickoffAt: '2026-06-25T23:00:00Z', venue: 'AT&T Stadium, Arlington', groupKey: 'F' },
  { matchNumber: 58, homeCode: 'TUN', awayCode: 'NED', kickoffAt: '2026-06-25T23:00:00Z', venue: 'Arrowhead Stadium, Kansas City', groupKey: 'F' },
  { matchNumber: 59, homeCode: 'TUR', awayCode: 'USA', kickoffAt: '2026-06-26T02:00:00Z', venue: 'SoFi Stadium, Los Ángeles', groupKey: 'D' },
  { matchNumber: 60, homeCode: 'PAR', awayCode: 'AUS', kickoffAt: '2026-06-26T02:00:00Z', venue: 'Levi\'s Stadium, Santa Clara', groupKey: 'D' },
  // June 26
  { matchNumber: 61, homeCode: 'NOR', awayCode: 'FRA', kickoffAt: '2026-06-26T19:00:00Z', venue: 'Gillette Stadium, Foxborough', groupKey: 'I' },
  { matchNumber: 62, homeCode: 'SEN', awayCode: 'IRQ', kickoffAt: '2026-06-26T19:00:00Z', venue: 'BMO Field, Toronto', groupKey: 'I' },
  { matchNumber: 63, homeCode: 'CPV', awayCode: 'KSA', kickoffAt: '2026-06-27T00:00:00Z', venue: 'NRG Stadium, Houston', groupKey: 'H' },
  { matchNumber: 64, homeCode: 'URU', awayCode: 'ESP', kickoffAt: '2026-06-27T00:00:00Z', venue: 'Estadio Akron, Guadalajara', groupKey: 'H' },
  { matchNumber: 65, homeCode: 'EGY', awayCode: 'IRN', kickoffAt: '2026-06-27T03:00:00Z', venue: 'Lumen Field, Seattle', groupKey: 'G' },
  { matchNumber: 66, homeCode: 'NZL', awayCode: 'BEL', kickoffAt: '2026-06-27T03:00:00Z', venue: 'BC Place, Vancouver', groupKey: 'G' },
  // June 27
  { matchNumber: 67, homeCode: 'PAN', awayCode: 'ENG', kickoffAt: '2026-06-27T21:00:00Z', venue: 'MetLife Stadium, Nueva Jersey', groupKey: 'L' },
  { matchNumber: 68, homeCode: 'CRO', awayCode: 'GHA', kickoffAt: '2026-06-27T21:00:00Z', venue: 'Lincoln Financial Field, Filadelfia', groupKey: 'L' },
  { matchNumber: 69, homeCode: 'COL', awayCode: 'POR', kickoffAt: '2026-06-27T23:30:00Z', venue: 'Hard Rock Stadium, Miami', groupKey: 'K' },
  { matchNumber: 70, homeCode: 'COD', awayCode: 'UZB', kickoffAt: '2026-06-27T23:30:00Z', venue: 'Mercedes-Benz Stadium, Atlanta', groupKey: 'K' },
  { matchNumber: 71, homeCode: 'ALG', awayCode: 'AUT', kickoffAt: '2026-06-28T02:00:00Z', venue: 'Arrowhead Stadium, Kansas City', groupKey: 'J' },
  { matchNumber: 72, homeCode: 'JOR', awayCode: 'ARG', kickoffAt: '2026-06-28T02:00:00Z', venue: 'AT&T Stadium, Arlington', groupKey: 'J' },
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
      phase1ClosesAt: new Date('2026-06-11T19:00:00Z'), // kick-off 1st match
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
