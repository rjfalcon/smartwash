import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!await isAdminAuthenticated()) {
    return NextResponse.json({ success: false, error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const machines = await db.machine.findMany({
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ success: true, data: machines });
  } catch (err) {
    console.error('[admin/machines GET]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij ophalen machines' },
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
      id: string;
      name?: string;
      tuyaDeviceId?: string;
      description?: string;
      isActive?: boolean;
    };

    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Machine ID is verplicht' },
        { status: 400 },
      );
    }

    const machine = await db.machine.update({
      where: { id },
      data: updateData,
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });

    return NextResponse.json({ success: true, data: machine });
  } catch (err) {
    console.error('[admin/machines PATCH]', err);
    return NextResponse.json(
      { success: false, error: 'Fout bij opslaan machine' },
      { status: 500 },
    );
  }
}
