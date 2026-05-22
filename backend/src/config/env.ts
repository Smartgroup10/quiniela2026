import 'dotenv/config';

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.serviciodecorreo.es',
  SMTP_PORT: process.env.SMTP_PORT || '465',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY || '',
  FOOTBALL_API_ENABLED: process.env.FOOTBALL_API_ENABLED === 'true',
};
