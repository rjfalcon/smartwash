import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        machine: { select: { name: true, type: true } },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Betaling niet gevonden' },
        { status: 404 },
      );
    }

    const now = new Date();
    let secondsRemaining: number | null = null;
    let minutesRemaining: number | null = null;

    if (payment.status === 'ACTIVE' && payment.endsAt) {
      const msLeft = payment.endsAt.getTime() - now.getTime();
      secondsRemaining = Math.max(0, Math.floor(msLeft / 1000));
      minutesRemaining = Math.max(0, Math.floor(secondsRemaining / 60));

      // Auto-expire if time is up
      if (msLeft <= 0) {
        await db.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });
        payment.status = 'COMPLETED';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: payment.id,
        mollieId: payment.mollieId,
        machineId: payment.machineId,
        machine: payment.machine,
        status: payment.status,
        amount: payment.amount,
        duration: payment.duration,
        optionLabel: payment.optionLabel,
        customerEmail: payment.customerEmail,
        startedAt: payment.startedAt?.toISOString() ?? null,
        endsAt: payment.endsAt?.toISOString() ?? null,
        secondsRemaining,
        minutesRemaining,
        createdAt: payment.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error('[payment/status]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij ophalen status' },
      { status: 500 },
    );
  }
}
