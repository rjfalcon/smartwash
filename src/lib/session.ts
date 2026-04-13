import { db } from './db';
import { tuyaSwitchOff } from './tuya';

/**
 * Checks all active sessions and marks expired ones as COMPLETED,
 * turning off the Tuya plug. Called by the scheduler API route.
 */
export async function processExpiredSessions(): Promise<{
  processed: number;
  errors: string[];
}> {
  const now = new Date();
  const errors: string[] = [];
  let processed = 0;

  const expiredPayments = await db.payment.findMany({
    where: {
      status: 'ACTIVE',
      endsAt: { lte: now },
    },
    include: { machine: true },
  });

  for (const payment of expiredPayments) {
    try {
      // Turn off the plug
      await tuyaSwitchOff(payment.machine.tuyaDeviceId);

      // Update payment status
      await db.payment.update({
        where: { id: payment.id },
        data: { status: 'COMPLETED' },
      });

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Payment ${payment.id}: ${message}`);
    }
  }

  return { processed, errors };
}

/**
 * Returns the active session for a machine, if any.
 */
export async function getActiveSession(machineId: string) {
  const now = new Date();

  const payment = await db.payment.findFirst({
    where: {
      machineId,
      status: 'ACTIVE',
      endsAt: { gt: now },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (!payment || !payment.endsAt || !payment.startedAt) return null;

  const endsAt = payment.endsAt;
  const totalMs = endsAt.getTime() - now.getTime();
  const secondsRemaining = Math.max(0, Math.floor(totalMs / 1000));
  const minutesRemaining = Math.max(0, Math.floor(secondsRemaining / 60));

  return {
    paymentId: payment.id,
    startedAt: payment.startedAt.toISOString(),
    endsAt: endsAt.toISOString(),
    minutesRemaining,
    secondsRemaining,
  };
}
