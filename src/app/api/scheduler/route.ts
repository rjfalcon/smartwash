import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tuyaSwitchOff } from '@/lib/tuya';
import { sendExpiryWarningEmail } from '@/lib/email';

const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET ?? 'smartwash-scheduler';

function isAuthorized(request: NextRequest): boolean {
  // Vercel Cron Jobs set this header automatically
  if (request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`) {
    return true;
  }
  // Manual secret in header or query param (for self-hosted cron)
  if (request.headers.get('x-scheduler-secret') === SCHEDULER_SECRET) {
    return true;
  }
  if (request.nextUrl.searchParams.get('secret') === SCHEDULER_SECRET) {
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runScheduler();
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runScheduler();
}

async function runScheduler() {
  const now = new Date();
  const results = {
    expired: 0,
    warned: 0,
    errors: [] as string[],
  };

  try {
    const settings = await db.appSettings.findUnique({
      where: { id: 'singleton' },
    });
    const parkName = settings?.parkName ?? 'SmartWash';

    // 1. Process expired sessions
    const expiredPayments = await db.payment.findMany({
      where: { status: 'ACTIVE', endsAt: { lte: now } },
      include: { machine: true },
    });

    for (const payment of expiredPayments) {
      try {
        if (settings?.tuyaAutoOff) {
          await tuyaSwitchOff(payment.machine.tuyaDeviceId);
        }
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });
        results.expired++;
      } catch (err) {
        results.errors.push(`Expire ${payment.id}: ${String(err)}`);
      }
    }

    // 2. Send 5-minute warnings
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const sixMinutesFromNow = new Date(now.getTime() + 6 * 60 * 1000);

    const aboutToExpire = await db.payment.findMany({
      where: {
        status: 'ACTIVE',
        customerEmail: { not: null },
        warningsSent: 0,
        endsAt: {
          gte: fiveMinutesFromNow,
          lte: sixMinutesFromNow,
        },
      },
      include: { machine: true },
    });

    for (const payment of aboutToExpire) {
      if (!payment.customerEmail) continue;
      try {
        await sendExpiryWarningEmail(
          payment.customerEmail,
          payment,
          5,
          parkName,
        );
        await db.payment.update({
          where: { id: payment.id },
          data: { warningsSent: 1 },
        });
        results.warned++;
      } catch (err) {
        results.errors.push(`Warning ${payment.id}: ${String(err)}`);
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    console.error('[scheduler]', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}
