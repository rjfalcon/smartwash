import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const settings = await db.appSettings.findUnique({
      where: { id: 'singleton' },
    });

    // Don't expose the PIN in settings response
    const { adminPin: _pin, ...safeSettings } = settings ?? {
      adminPin: '',
      notifyEmails: '',
      parkName: 'Ons Park',
      appName: 'SmartWash',
      baseUrl: '',
      tuyaAutoOff: true,
      emailOnPayment: true,
    };

    return NextResponse.json({ success: true, data: safeSettings });
  } catch (err) {
    console.error('[admin/settings GET]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij ophalen instellingen' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const body = await request.json() as {
      notifyEmails?: string;
      parkName?: string;
      appName?: string;
      baseUrl?: string;
      tuyaAutoOff?: boolean;
      emailOnPayment?: boolean;
      adminPin?: string;
    };

    const updateData: Record<string, unknown> = {};

    if (body.notifyEmails !== undefined) updateData.notifyEmails = body.notifyEmails;
    if (body.parkName !== undefined) updateData.parkName = body.parkName;
    if (body.appName !== undefined) updateData.appName = body.appName;
    if (body.baseUrl !== undefined) updateData.baseUrl = body.baseUrl;
    if (body.tuyaAutoOff !== undefined) updateData.tuyaAutoOff = body.tuyaAutoOff;
    if (body.emailOnPayment !== undefined) updateData.emailOnPayment = body.emailOnPayment;
    if (body.adminPin?.trim()) updateData.adminPin = body.adminPin.trim();

    await db.appSettings.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: { id: 'singleton', ...updateData },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[admin/settings PATCH]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij opslaan instellingen' },
      { status: 500 },
    );
  }
}
