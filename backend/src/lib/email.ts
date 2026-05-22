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
