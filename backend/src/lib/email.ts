import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: Number(env.SMTP_PORT) === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendInvitationEmail(
  to: string,
  name: string,
  tempPassword: string,
) {
  const loginUrl = `${env.FRONTEND_URL}/login`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:'Inter',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;border-radius:12px;border:1px solid #2D2D2D;overflow:hidden;">
        <tr><td style="background-color:#E63946;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;">&#9917; Quiniela Mundial 2026</h1>
        </td></tr>
        <tr><td style="padding:32px 24px;">
          <h2 style="color:#F1FAEE;margin:0 0 16px 0;font-size:20px;">Hola ${name}, has sido invitado!</h2>
          <p style="color:#A8A8A8;font-size:15px;line-height:1.6;margin:0 0 24px 0;">
            Se ha creado una cuenta para ti en la Quiniela del Mundial 2026. Usa las siguientes credenciales para acceder:
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:8px;border:1px solid #2D2D2D;margin-bottom:24px;">
            <tr><td style="padding:20px;">
              <p style="color:#A8A8A8;margin:0 0 8px 0;font-size:13px;">CORREO ELECTRONICO</p>
              <p style="color:#F1FAEE;margin:0 0 16px 0;font-size:16px;font-weight:600;">${to}</p>
              <p style="color:#A8A8A8;margin:0 0 8px 0;font-size:13px;">CONTRASENA TEMPORAL</p>
              <p style="color:#E63946;margin:0;font-size:18px;font-weight:700;font-family:monospace;letter-spacing:2px;">${tempPassword}</p>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${loginUrl}" style="display:inline-block;background-color:#E63946;color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
                Iniciar Sesion
              </a>
            </td></tr>
          </table>
          <div style="margin-top:24px;padding:16px;background-color:#2D2D2D;border-radius:8px;border-left:4px solid #F4A261;">
            <p style="color:#F4A261;margin:0 0 4px 0;font-size:13px;font-weight:600;">IMPORTANTE</p>
            <p style="color:#A8A8A8;margin:0;font-size:14px;line-height:1.5;">
              Al iniciar sesion por primera vez, se te pedira cambiar tu contrasena.
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #2D2D2D;text-align:center;">
          <p style="color:#A8A8A8;margin:0;font-size:12px;">Este es un correo automatico. No respondas a este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Quiniela Mundial 2026" <${env.SMTP_USER}>`,
    to,
    subject: 'Has sido invitado a la Quiniela Mundial 2026',
    html,
  });
}

// ─────────────────────────────────────────────────────────────
// Email diario con los partidos del dia y predicciones de todos
// ─────────────────────────────────────────────────────────────

interface DailyMatchInfo {
  matchNumber: number;
  round: string | null;
  stage: string;
  kickoffMadrid: string;
  homeTeam: { code: string; name: string } | null;
  awayTeam: { code: string; name: string } | null;
  predictions: {
    userName: string;
    homeGoals: number;
    awayGoals: number;
    winnerCode: string | null;
    wentToPenalties: boolean;
  }[];
}

function renderMatchBlock(m: DailyMatchInfo): string {
  const home = m.homeTeam?.name || 'TBD';
  const away = m.awayTeam?.name || 'TBD';
  const homeCode = m.homeTeam?.code || 'TBD';
  const awayCode = m.awayTeam?.code || 'TBD';
  const roundLabel = m.round ? `${m.stage} · ${m.round}` : m.stage;

  const rows = m.predictions.length === 0
    ? `<tr><td colspan="3" style="padding:12px;color:#A8A8A8;text-align:center;font-size:13px;">Nadie predijo este partido.</td></tr>`
    : m.predictions.map(pr => `
        <tr>
          <td style="padding:6px 10px;color:#F1FAEE;font-size:13px;border-bottom:1px solid #2D2D2D;">${escapeHtml(pr.userName)}</td>
          <td style="padding:6px 10px;color:#F1FAEE;font-size:13px;font-family:monospace;text-align:center;border-bottom:1px solid #2D2D2D;">${pr.homeGoals}-${pr.awayGoals}${pr.wentToPenalties ? ' [p]' : ''}</td>
          <td style="padding:6px 10px;color:#D4A93C;font-size:13px;font-weight:600;text-align:center;border-bottom:1px solid #2D2D2D;">${pr.winnerCode || '—'}</td>
        </tr>`).join('');

  return `
    <div style="background-color:#111111;border-radius:8px;border:1px solid #2D2D2D;margin-bottom:20px;overflow:hidden;">
      <div style="padding:14px 16px;background-color:#1F1F1F;border-bottom:1px solid #2D2D2D;">
        <div style="color:#D4A93C;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">
          #${m.matchNumber} · ${roundLabel} · ${m.kickoffMadrid}
        </div>
        <div style="color:#F1FAEE;font-size:16px;font-weight:600;">
          ${escapeHtml(home)} <span style="color:#A8A8A8;font-size:12px;">vs</span> ${escapeHtml(away)}
        </div>
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <thead>
          <tr style="background-color:#151515;">
            <th style="padding:8px 10px;color:#A8A8A8;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;text-align:left;">Usuario</th>
            <th style="padding:8px 10px;color:#A8A8A8;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;text-align:center;">Marcador</th>
            <th style="padding:8px 10px;color:#A8A8A8;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;text-align:center;">Ganador</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendDailyPredictionsEmail(
  to: string,
  userName: string,
  dateLabel: string,
  matches: DailyMatchInfo[],
) {
  const matchBlocks = matches.map(renderMatchBlock).join('');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:'Inter',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0A;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background-color:#1A1A1A;border-radius:12px;border:1px solid #2D2D2D;overflow:hidden;max-width:640px;">
        <tr><td style="background-color:#E63946;padding:22px 24px;text-align:center;">
          <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:700;">&#9917; Quiniela Mundial 2026</h1>
          <div style="color:#FFDDDD;font-size:13px;margin-top:4px;">Predicciones del ${dateLabel}</div>
        </td></tr>
        <tr><td style="padding:28px 24px;">
          <p style="color:#F1FAEE;font-size:15px;margin:0 0 8px 0;">Hola ${escapeHtml(userName)},</p>
          <p style="color:#A8A8A8;font-size:14px;line-height:1.6;margin:0 0 24px 0;">
            Aqui tienes los partidos de hoy con las predicciones que puso cada jugador. Suerte con tu bracket!
          </p>
          ${matchBlocks}
          <p style="color:#5F5F5F;font-size:11px;margin:24px 0 0 0;text-align:center;">
            Como el bracket ya esta cerrado, las predicciones son publicas.
          </p>
        </td></tr>
        <tr><td style="padding:14px 24px;border-top:1px solid #2D2D2D;text-align:center;">
          <p style="color:#5F5F5F;margin:0;font-size:11px;">Correo automatico. No respondas.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Quiniela Mundial 2026" <${env.SMTP_USER}>`,
    to,
    subject: `Quiniela — Partidos del ${dateLabel} y predicciones de todos`,
    html,
  });
}
