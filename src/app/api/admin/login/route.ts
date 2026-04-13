import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPin, setAdminSession, clearAdminSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { pin: string };
    const { pin } = body;

    if (!pin) {
      return NextResponse.json(
        { success: false, error: 'PIN is verplicht' },
        { status: 400 },
      );
    }

    const isValid = await verifyAdminPin(pin);

    if (!isValid) {
      // Small delay to prevent brute force
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json(
        { success: false, error: 'Onjuiste PIN' },
        { status: 401 },
      );
    }

    await setAdminSession();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/login]', err);
    return NextResponse.json(
      { success: false, error: 'Inloggen mislukt' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
