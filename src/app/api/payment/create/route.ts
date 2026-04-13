import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getMollieClient, getBaseUrl } from '@/lib/mollie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      machineId: string;
      optionId: string;
      customerEmail?: string;
      customerName?: string;
    };

    const { machineId, optionId, customerEmail, customerName } = body;

    if (!machineId || !optionId) {
      return NextResponse.json(
        { success: false, error: 'machineId en optionId zijn verplicht' },
        { status: 400 },
      );
    }

    const machine = await db.machine.findUnique({
      where: { id: machineId, isActive: true },
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine niet gevonden' },
        { status: 404 },
      );
    }

    const option = await db.paymentOption.findUnique({
      where: { id: optionId, machineId, isActive: true },
    });

    if (!option) {
      return NextResponse.json(
        { success: false, error: 'Optie niet gevonden' },
        { status: 404 },
      );
    }

    // Check if machine is currently active
    const now = new Date();
    const activeSession = await db.payment.findFirst({
      where: { machineId, status: 'ACTIVE', endsAt: { gt: now } },
    });

    if (activeSession) {
      return NextResponse.json(
        { success: false, error: 'Machine is momenteel al in gebruik' },
        { status: 409 },
      );
    }

    // Create a pending DB record first — use its ID in the redirect URL
    const pendingPayment = await db.payment.create({
      data: {
        machineId,
        mollieId: 'pending', // temporary, updated after Mollie call
        amount: option.price,
        duration: option.duration,
        optionLabel: option.label,
        status: 'PENDING',
        customerEmail: customerEmail?.trim() || null,
        customerName: customerName?.trim() || null,
      },
    });

    const baseUrl = getBaseUrl();
    const mollie = getMollieClient();

    // Create Mollie payment, referencing our internal ID in the redirect URL
    const molliePayment = await mollie.payments.create({
      amount: {
        currency: 'EUR',
        value: option.price.toFixed(2),
      },
      description: `${machine.name} — ${option.label}`,
      redirectUrl: `${baseUrl}/payment/success?ref=${pendingPayment.id}`,
      webhookUrl: `${baseUrl}/api/payment/webhook`,
      metadata: {
        paymentDbId: pendingPayment.id,
        machineId,
        duration: option.duration,
        optionLabel: option.label,
      },
    });

    // Update DB record with the real Mollie payment ID
    await db.payment.update({
      where: { id: pendingPayment.id },
      data: { mollieId: molliePayment.id },
    });

    const checkoutUrl = molliePayment._links?.checkout?.href;

    return NextResponse.json({
      success: true,
      data: {
        paymentId: pendingPayment.id,
        mollieId: molliePayment.id,
        checkoutUrl,
      },
    });
  } catch (err) {
    console.error('[payment/create]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij aanmaken betaling. Probeer opnieuw.' },
      { status: 500 },
    );
  }
}
