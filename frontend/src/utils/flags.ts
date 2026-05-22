// Maps FIFA 3-letter codes to ISO 3166-1 alpha-2 (used by flagcdn.com)
const FIFA_TO_ISO2: Record<string, string> = {
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz',
  CAN: 'ca', SUI: 'ch', QAT: 'qa', BIH: 'ba',
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct',
  USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec',
  NED: 'nl', JPN: 'jp', SWE: 'se', TUN: 'tn',
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz',
  ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
  FRA: 'fr', SEN: 'sn', NOR: 'no', IRQ: 'iq',
  ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  POR: 'pt', COD: 'cd', UZB: 'uz', COL: 'co',
  ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa',
};

// flagcdn.com only supports these widths
const VALID_WIDTHS = [20, 40, 80, 160, 320, 640, 1280, 2560];

function snapWidth(w: number): number {
  return VALID_WIDTHS.find((v) => v >= w) ?? 160;
}

export function getFlagUrl(teamCode: string, size = 40): string {
  const iso2 = FIFA_TO_ISO2[teamCode];
  if (!iso2) return '';
  return `https://flagcdn.com/w${snapWidth(size)}/${iso2}.png`;
}
