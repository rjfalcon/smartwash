import nodemailer from 'nodemailer';

// Use a looser type so Prisma return types (with Date) and serialized types (with string) both work
interface PaymentData {
  id: string;
  machineId: string;
  amount: number;
  duration: number;
  optionLabel: string;
  status: string;
  customerEmail: string | null;
  customerName: string | null;
  startedAt: Date | string | null;
  endsAt: Date | string | null;
  createdAt: Date | string;
  machine: { name: string; type: string };
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function getConfig(): EmailConfig {
  return {
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'SmartWash <noreply@example.com>',
  };
}

function createTransporter() {
  const config = getConfig();
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
}

function formatTime(date: string | Date): string {
  return new Date(date).toLocaleString('nl-NL', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Amsterdam',
  });
}

function formatEur(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export async function sendPaymentSuccessEmail(
  toEmail: string,
  payment: PaymentData,
  parkName: string,
): Promise<void> {
  const transporter = createTransporter();
  const config = getConfig();

  const endsAt = payment.endsAt ? formatTime(payment.endsAt) : 'Onbekend';

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Betaling bevestigd</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f0f9ff; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 12px; max-width: 500px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: #0ea5e9; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 8px 0 0; opacity: 0.9; }
    .body { padding: 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; }
    .detail-value { font-weight: 600; color: #1e293b; }
    .status-badge { background: #dcfce7; color: #16a34a; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; }
    .footer { background: #f8fafc; padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 13px; }
    .end-time { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px 16px; margin: 16px 0; text-align: center; }
    .end-time strong { color: #b45309; font-size: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>✅ Betaling geslaagd!</h1>
      <p>${parkName} — SmartWash</p>
    </div>
    <div class="body">
      <p>Bedankt voor je betaling! De ${payment.machine.name.toLowerCase()} is nu ingeschakeld.</p>

      <div class="end-time">
        <div>Machine stopt automatisch om</div>
        <strong>${endsAt}</strong>
      </div>

      <div class="detail-row">
        <span class="detail-label">Machine</span>
        <span class="detail-value">${payment.machine.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Programma</span>
        <span class="detail-value">${payment.optionLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Duur</span>
        <span class="detail-value">${payment.duration} minuten</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Bedrag</span>
        <span class="detail-value">${formatEur(payment.amount)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Status</span>
        <span class="detail-value"><span class="status-badge">Actief</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Betalingsnummer</span>
        <span class="detail-value" style="font-size:13px;color:#64748b">${payment.id.slice(0, 12)}</span>
      </div>
    </div>
    <div class="footer">
      ${parkName} · SmartWash automatisch betalingssysteem
    </div>
  </div>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: config.from,
    to: toEmail,
    subject: `✅ ${payment.machine.name} gestart — ${formatEur(payment.amount)}`,
    html,
  });
}

export async function sendAdminNotificationEmail(
  toEmails: string[],
  payment: PaymentData,
  parkName: string,
): Promise<void> {
  if (toEmails.length === 0) return;

  const transporter = createTransporter();
  const config = getConfig();

  const createdAt = formatTime(payment.createdAt);
  const endsAt = payment.endsAt ? formatTime(payment.endsAt) : '—';

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Nieuwe betaling</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 12px; max-width: 500px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #1e293b; color: white; padding: 20px 24px; }
    .header h1 { margin: 0; font-size: 18px; }
    .body { padding: 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #64748b; font-size: 14px; }
    .detail-value { font-weight: 600; color: #1e293b; font-size: 14px; }
    .footer { background: #f8fafc; padding: 12px 24px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>💰 Nieuwe betaling ontvangen</h1>
    </div>
    <div class="body">
      <div class="detail-row">
        <span class="detail-label">Machine</span>
        <span class="detail-value">${payment.machine.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Bedrag</span>
        <span class="detail-value">${formatEur(payment.amount)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Duur</span>
        <span class="detail-value">${payment.duration} min (${payment.optionLabel})</span>
      </div>
      ${payment.customerName ? `
      <div class="detail-row">
        <span class="detail-label">Naam</span>
        <span class="detail-value">${payment.customerName}</span>
      </div>` : ''}
      ${payment.customerEmail ? `
      <div class="detail-row">
        <span class="detail-label">E-mail klant</span>
        <span class="detail-value">${payment.customerEmail}</span>
      </div>` : ''}
      <div class="detail-row">
        <span class="detail-label">Betaald om</span>
        <span class="detail-value">${createdAt}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Machine stopt om</span>
        <span class="detail-value">${endsAt}</span>
      </div>
    </div>
    <div class="footer">${parkName} · SmartWash</div>
  </div>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: config.from,
    to: toEmails.join(', '),
    subject: `💰 Nieuwe betaling: ${payment.machine.name} — ${formatEur(payment.amount)}`,
    html,
  });
}

export async function sendExpiryWarningEmail(
  toEmail: string,
  payment: PaymentData,
  minutesLeft: number,
  parkName: string,
): Promise<void> {
  const transporter = createTransporter();
  const config = getConfig();

  const html = `
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <title>Nog ${minutesLeft} minuten</title>
  <style>
    body { font-family: Arial, sans-serif; background: #fffbeb; margin: 0; padding: 20px; }
    .card { background: white; border-radius: 12px; max-width: 500px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: #f59e0b; color: white; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .body { padding: 24px; text-align: center; }
    .big-time { font-size: 48px; font-weight: bold; color: #f59e0b; }
    .footer { background: #f8fafc; padding: 16px 24px; text-align: center; color: #94a3b8; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>⏰ Bijna klaar!</h1>
    </div>
    <div class="body">
      <p>Je ${payment.machine.name.toLowerCase()} stopt over:</p>
      <div class="big-time">${minutesLeft} min</div>
      <p style="color:#64748b;margin-top:16px">
        Vergeet je was niet op te halen!
      </p>
    </div>
    <div class="footer">${parkName} · SmartWash</div>
  </div>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: config.from,
    to: toEmail,
    subject: `⏰ Nog ${minutesLeft} minuten — ${payment.machine.name}`,
    html,
  });
}
