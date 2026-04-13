import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getMollieClient } from '@/lib/mollie';
import { tuyaSwitchOn } from '@/lib/tuya';
import { sendPaymentSuccessEmail, sendAdminNotificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const mollieId = formData.get('id') as string;

    if (!mollieId) {
      return new NextResponse('Missing id', { status: 400 });
    }

    const mollie = getMollieClient();
    const molliePayment = await mollie.payments.get(mollieId);

    const dbPayment = await db.payment.findUnique({
      where: { mollieId },
      include: { machine: true },
    });

    if (!dbPayment) {
      console.warn(`[webhook] Payment not found in DB: ${mollieId}`);
      return new NextResponse('OK', { status: 200 });
    }

    if (dbPayment.status !== 'PENDING') {
      // Already processed
      return new NextResponse('OK', { status: 200 });
    }

    const mollieStatus = molliePayment.status;

    if (mollieStatus === 'paid') {
      const now = new Date();
      const endsAt = new Date(now.getTime() + dbPayment.duration * 60 * 1000);

      // Update payment to ACTIVE
      const updatedPayment = await db.payment.update({
        where: { id: dbPayment.id },
        data: {
          status: 'ACTIVE',
          startedAt: now,
          endsAt,
        },
        include: { machine: true },
      });

      // Turn on the Tuya smart plug
      try {
        await tuyaSwitchOn(dbPayment.machine.tuyaDeviceId);
      } catch (tuyaErr) {
        console.error('[webhook] Tuya switch on failed:', tuyaErr);
        // Mark as PAID but not yet ACTIVE — admin can manually activate
        await db.payment.update({
          where: { id: dbPayment.id },
          data: { status: 'PAID', notes: `Tuya fout: ${String(tuyaErr)}` },
        });
      }

      // Send customer email if email provided
      const settings = await db.appSettings.findUnique({
        where: { id: 'singleton' },
      });
      const parkName = settings?.parkName ?? 'SmartWash';

      if (settings?.emailOnPayment && dbPayment.customerEmail) {
        try {
          await sendPaymentSuccessEmail(
            dbPayment.customerEmail,
            updatedPayment,
            parkName,
          );
        } catch (emailErr) {
          console.error('[webhook] Customer email failed:', emailErr);
        }
      }

      // Send admin notifications
      if (settings?.notifyEmails) {
        const adminEmails = settings.notifyEmails
          .split(',')
          .map((e) => e.trim())
          .filter(Boolean);

        if (adminEmails.length > 0) {
          try {
            await sendAdminNotificationEmail(
              adminEmails,
              updatedPayment,
              parkName,
            );
          } catch (emailErr) {
            console.error('[webhook] Admin email failed:', emailErr);
          }
        }
      }
    } else if (
      mollieStatus === 'failed' ||
      mollieStatus === 'canceled' ||
      mollieStatus === 'expired'
    ) {
      const statusMap: Record<string, string> = {
        failed: 'FAILED',
        canceled: 'CANCELLED',
        expired: 'EXPIRED',
      };

      await db.payment.update({
        where: { id: dbPayment.id },
        data: { status: statusMap[mollieStatus] ?? 'FAILED' },
      });
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[webhook] Error:', err);
    // Return 200 to prevent Mollie from retrying indefinitely
    return new NextResponse('OK', { status: 200 });
  }
}
